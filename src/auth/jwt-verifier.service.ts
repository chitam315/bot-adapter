import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload, RemoteJWKSet } from 'jose';
import { AppConfigService } from '../config/config.service';
import { OIDC_DISCOVERY_PATH } from '../constants';

interface OidcDiscoveryDocument {
  jwks_uri: string;
}

/**
 * Verifies SSO-issued JWTs against the issuer's JWKS. The JWKS URI isn't
 * guessed from a provider-specific convention — it's read from the
 * issuer's own OIDC discovery document, so this works unmodified across
 * Azure AD/Entra ID, Auth0, Keycloak, Okta, etc.
 *
 * The JWKS itself is resolved lazily (on first verify call, not at module
 * boot) so booting the app/test module graph never makes a network call on
 * its own — only actually verifying a token does. `createRemoteJWKSet`
 * handles its own in-memory key caching/rotation after that.
 */
@Injectable()
export class JwtVerifierService {
  private jwks?: RemoteJWKSet;

  constructor(private readonly config: AppConfigService) {}

  async verify(token: string): Promise<JWTPayload> {
    const { issuer, clientId } = this.config.sso;
    const jwks = await this.getJwks();

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: clientId,
    });

    return payload;
  }

  private async getJwks(): Promise<RemoteJWKSet> {
    if (!this.jwks) {
      const jwksUri = await this.discoverJwksUri();
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
    }

    return this.jwks;
  }

  private async discoverJwksUri(): Promise<string> {
    const { issuer } = this.config.sso;
    const discoveryUrl = new URL(
      OIDC_DISCOVERY_PATH,
      issuer.endsWith('/') ? issuer : `${issuer}/`,
    );

    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      throw new Error(
        `OIDC discovery request to ${discoveryUrl.toString()} failed with status ${response.status}`,
      );
    }

    const document = (await response.json()) as OidcDiscoveryDocument;
    if (!document.jwks_uri) {
      throw new Error(
        `OIDC discovery document at ${discoveryUrl.toString()} is missing "jwks_uri"`,
      );
    }

    return document.jwks_uri;
  }
}
