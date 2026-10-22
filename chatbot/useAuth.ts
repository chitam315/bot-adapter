'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Cookies, useCookies } from 'react-cookie';
import { decodeJwt, JWTPayload } from 'jose';
import { EnvPublic } from '@/lib/env.public';
import { refreshSsoToken, onSsoSessionLost } from '@/lib/auth-sso-refresh';

/**
 * Reads the refresh-token cookie directly (bypassing the reactive
 * `useCookies` watcher, since this also needs to run from an effect before
 * the hook's own cookie state has settled).
 */
function hasRefreshTokenCookie(): boolean {
  return !!new Cookies().get(EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY);
}

function decodeIdToken(token: string): JWTPayload | null {
  try {
    // Decoded for its claims only — expiration is NOT enforced here.
    // Letting a stale-but-present token through lets the next request 401,
    // which triggers `ssoRefreshLink` to refresh it. Logging out on a
    // locally-perceived expiry would delete the refresh token before it
    // could ever be used.
    return decodeJwt<JWTPayload>(token);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

export const useAuth = () => {
  const [cookies, , removeCookie] = useCookies([
    EnvPublic.SSO_IDTOKEN_COOKIE_KEY,
    EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY,
  ]);

  const [tokenPayload, setTokenPayload] = useState<JWTPayload | null>(null);
  const [decoded, setDecoded] = useState(false);
  const hasAttemptedInitialRefresh = useRef(false);

  const token = cookies[EnvPublic.SSO_IDTOKEN_COOKIE_KEY] as string | undefined;

  const logout = useCallback(() => {
    removeCookie(EnvPublic.SSO_IDTOKEN_COOKIE_KEY, {
      domain: EnvPublic.COOKIE_DOMAIN,
      path: '/',
    });
    removeCookie(EnvPublic.SSO_REFRESHTOKEN_COOKIE_KEY, {
      domain: EnvPublic.COOKIE_DOMAIN,
      path: '/',
    });
    // Don't rely on cookie-change reactivity (or on the removal succeeding —
    // it silently no-ops when domain/path differ from how the cookie was
    // set): null the payload directly so queries gated on it are disabled.
    setTokenPayload(null);
  }, [removeCookie]);

  // The refresh flow lost the session (refresh token missing / rejected).
  // Disable queries gated on `tokenPayload?.sub` right away so they stop
  // refetching (see `onSsoSessionLost`).
  useEffect(
    () =>
      onSsoSessionLost(() => {
        setTokenPayload(null);
        setDecoded(true);
      }),
    [],
  );

  useEffect(() => {
    if (token) {
      setTokenPayload(decodeIdToken(token));
      setDecoded(true);
      return;
    }

    // No idToken cookie (e.g. it expired and was dropped by the browser
    // while the longer-lived refresh-token cookie is still present — this
    // happens on a full page reload, unlike an in-app 401 which always has
    // an existing tokenPayload to work with). Hold off on settling into
    // "logged out" — the proactive-refresh effect below will attempt a
    // refresh first. If there's no refresh token either, settle immediately.
    if (!hasAttemptedInitialRefresh.current && hasRefreshTokenCookie()) {
      return;
    }

    setTokenPayload(null);
    setDecoded(true);
  }, [token]);

  // On first load, if there's no idToken but a refresh-token cookie is
  // present, proactively refresh instead of sitting in a "not logged in"
  // state until something happens to call an API and hit a 401.
  //
  // `refreshSsoToken()` writes cookies via its own vanilla `Cookies`
  // instance (it must run outside React, from the tRPC link too), which
  // doesn't reliably notify this hook's `useCookies` watcher. So after a
  // refresh we re-read the cookie directly and re-decode instead of relying
  // on cookie-change reactivity.
  useEffect(() => {
    if (token || hasAttemptedInitialRefresh.current) return;

    if (!hasRefreshTokenCookie()) {
      setDecoded(true);
      return;
    }

    hasAttemptedInitialRefresh.current = true;
    refreshSsoToken()
      .then(() => {
        const freshToken = new Cookies().get<string>(
          EnvPublic.SSO_IDTOKEN_COOKIE_KEY,
        );
        setTokenPayload(freshToken ? decodeIdToken(freshToken) : null);
      })
      .catch(() => {
        // No valid refresh token, or the refresh itself failed — stay logged
        // out silently; there's nothing more to try on initial load.
        setTokenPayload(null);
      })
      .finally(() => setDecoded(true));
  }, [token]);

  const isLoadingToken = !decoded;

  return {
    token,
    tokenPayload,
    isLoadingToken,
    logout,
  };
};
