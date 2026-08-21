// OIDC discovery well-known path, appended to the SSO issuer URL to find
// the provider's `jwks_uri` — standard across Azure AD/Entra ID, Auth0,
// Keycloak, Okta, etc. See https://openid.net/specs/openid-connect-discovery-1_0.html
export const OIDC_DISCOVERY_PATH = '.well-known/openid-configuration';

// AIA+ integration — key algorithm is fixed to the key type AIA+ issues
// (RSA/SPKI), so it stays a constant. Cookie name is operator-configurable —
// see AIA_PLUS_COOKIE_NAME in env.schema.ts / AppConfigService.aiaPlus.
export const AIA_PLUS_JWT_ALG = 'RS256';
