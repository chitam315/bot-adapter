import { decodeJwt, JWTPayload } from 'jose';

/** Truncated, safe-to-log stand-in for a raw token value. */
export function previewToken(token: string): string {
  return token.length > 12
    ? `${token.slice(0, 12)}…(${token.length} chars)`
    : token;
}

/**
 * Unverified claim decode for debug logging only — never use the result for
 * an authorization decision. Swallows decode failures (malformed/non-JWT
 * input) into a string instead of throwing, since this only ever runs
 * inside an already-failed verification's error handling.
 */
export function safeDecodeClaims(token: string): JWTPayload | string {
  try {
    return decodeJwt(token);
  } catch (error) {
    return `unable to decode token: ${(error as Error).message}`;
  }
}
