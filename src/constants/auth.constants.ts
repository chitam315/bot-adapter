// OIDC discovery well-known path, appended to the SSO issuer URL to find
// the provider's `jwks_uri` — standard across Azure AD/Entra ID, Auth0,
// Keycloak, Okta, etc. See https://openid.net/specs/openid-connect-discovery-1_0.html
export const OIDC_DISCOVERY_PATH = '.well-known/openid-configuration';
