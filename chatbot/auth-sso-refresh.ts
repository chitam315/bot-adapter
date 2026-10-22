'use client';

import { Cookies } from 'react-cookie';
import { TRPCClientError } from '@trpc/client';
import type { QueryClient } from '@tanstack/react-query';
import { getQueryKey } from '@trpc/react-query';
import { trpc } from './trpc/client/client';
import { EnvPublic } from './env.public';

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}

/**
 * Thrown whenever the SSO refresh flow (shared by the internal portal and the
 * alpa portal — both validate `getUserFromToken()` against the same cookies)
 * determines the user is not (or no longer) logged in: the refresh-token
 * cookie is missing, or the refresh endpoint rejects it. In all cases
 * retrying won't help — the FE should log the user out instead of looping.
 */
export class SsoNotLoggedInError extends Error {
  constructor(reason?: string) {
    super(
      reason
        ? `SSO refresh token rejected — user is not logged in (${reason})`
        : 'SSO refresh token is missing — user is not logged in',
    );
    this.name = 'SsoNotLoggedInError';
  }
}

/**
 * `ssoRefreshLink` must propagate a `TRPCClientError` (it wraps
 * `SsoNotLoggedInError` via `TRPCClientError.from` to satisfy the link's
 * observer type), so callers need to check both the raw error and the
 * wrapped `.cause` to detect a "not logged in" failure.
 */
export function isSsoNotLoggedInError(error: unknown): boolean {
  if (error instanceof SsoNotLoggedInError) return true;
  return (
    error instanceof TRPCClientError &&
    error.cause instanceof SsoNotLoggedInError
  );
}

/**
 * Clears the SSO cookies (idToken + refreshToken). Framework-agnostic (vanilla
 * `Cookies`) so it can run from the refresh flow outside React.
 */
export function logoutSso(): void {
  const cookies = new Cookies();
  const options = { domain: EnvPublic.COOKIE_DOMAIN, path: '/' };
  cookies.remove(EnvPublic.SSO_IDTOKEN_COOKIE_KEY, options);
  cookies.remove(EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY, options);
}

/**
 * Listeners notified synchronously when the SSO session is definitively lost
 * (refresh token missing / rejected). `useAuth` subscribes so it can null out
 * `tokenPayload` immediately, which flips `getMeInternal` / `getMeAlpa` to
 * `enabled: false`. This must NOT depend on (a) React observing a query error
 * — the global `QueryCache.onError` resets the query in the same tick the
 * error is dispatched — nor (b) the cookie actually disappearing, since
 * removal silently fails when the domain/path differs from how it was set.
 */
type SessionLostListener = () => void;
const sessionLostListeners = new Set<SessionLostListener>();

export function onSsoSessionLost(listener: SessionLostListener): () => void {
  sessionLostListeners.add(listener);
  return () => {
    sessionLostListeners.delete(listener);
  };
}

/** Clears cookies, notifies subscribers, and returns the error to throw. */
function sessionLost(reason?: string): SsoNotLoggedInError {
  logoutSso();
  sessionLostListeners.forEach((listener) => listener());
  return new SsoNotLoggedInError(reason);
}

/** Single-flight: if a refresh is already in progress, all callers await the same promise. */
let inflightRefresh: Promise<void> | null = null;

/**
 * Calls the SSO refresh-token endpoint and updates the idToken + refreshToken cookies.
 *
 * Single-flight: concurrent callers (e.g. batched 401s) share one in-flight request
 * and all receive the result once it resolves.
 *
 * Throws `SsoNotLoggedInError` if the refresh can't proceed/succeed, so the caller
 * (the tRPC link) can propagate the original 401 or surface "not logged in".
 */
export async function refreshSsoToken(): Promise<void> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = _doRefresh().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

/**
 * Clears the cached `getMeInternal` and `getMeAlpa` user queries so each
 * portal's auth guard re-renders its own "not logged in" UI. Both portals
 * share the same SSO cookies, so a failed refresh means both are logged out.
 *
 * Deliberately NOT `resetQueries`: it also refetches every active query, and
 * this runs from the global `QueryCache.onError`. While the query is still
 * `enabled` (stale `tokenPayload`), refetch -> 401 -> refresh fails -> onError
 * -> resetQueries -> refetch ... loops forever. `removeQueries` only drops the
 * cached data/error; refetching is then governed by `enabled`, which
 * `onSsoSessionLost` has already switched off.
 */
export function clearSsoUserCaches(queryClient: QueryClient): void {
  for (const procedure of [trpc.users.getMeInternal, trpc.users.getMeAlpa]) {
    const queryKey = getQueryKey(procedure, undefined, 'query');
    void queryClient.cancelQueries({ queryKey });
    queryClient.removeQueries({ queryKey });
  }
}

async function _doRefresh(): Promise<void> {
  const cookies = new Cookies();
  const refreshToken = cookies.get<string>(
    EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY,
  );

  // Without a refresh token, calling the endpoint would be pointless — surface
  // "not logged in" immediately without making the network request.
  if (!refreshToken) {
    throw sessionLost();
  }

  const response = await fetch(EnvPublic.SSO_REFRESH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: EnvPublic.SSO_CLIENT_ID,
      refreshToken,
    }),
  });

  if (!response.ok) {
    throw sessionLost(`Token refresh failed: ${response.status}`);
  }

  const data: RefreshTokenResponse = await response.json();

  if (!data.access_token || !data.refresh_token) {
    throw sessionLost('Malformed refresh response');
  }

  const expiresAt = (secondsFromNow: number) =>
    new Date(Date.now() + secondsFromNow * 1000);

  cookies.set(EnvPublic.SSO_IDTOKEN_COOKIE_KEY, data.access_token, {
    domain: EnvPublic.COOKIE_DOMAIN,
    path: '/',
    expires: expiresAt(data.expires_in),
  });
  cookies.set(EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY, data.refresh_token, {
    domain: EnvPublic.COOKIE_DOMAIN,
    path: '/',
    expires: expiresAt(data.refresh_token_expires_in),
  });
}
