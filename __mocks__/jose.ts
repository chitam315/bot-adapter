// Manual mock for the 'jose' package (JWT/JWKS), applied automatically to
// every test by Jest since it lives in <projectRoot>/__mocks__/ adjacent to
// node_modules. 'jose' ships ESM-only with no CJS build (same situation as
// the 'ai' package — see ai.ts in this folder), and we never want a real
// JWKS network fetch or signature verification firing during unit tests.
// Test files override these with their own `jest.mock('jose', ...)` factory
// when they need call-specific assertions (e.g. jwt-verifier.service.spec.ts).
export const createRemoteJWKSet = jest.fn();
export const jwtVerify = jest.fn();
export const decodeJwt = jest.fn();
