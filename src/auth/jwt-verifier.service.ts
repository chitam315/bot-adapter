import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload, RemoteJWKSet } from 'jose';
import { PinoLogger } from 'nestjs-pino';
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

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JwtVerifierService.name);
  }

  async verify(token: string): Promise<JWTPayload> {
    const { issuer, clientId } = this.config.sso;
    this.logger.debug(
      { tokenPreview: this.preview(token) },
      'Verifying SSO token',
    );

    const jwks = await this.getJwks();

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience: clientId,
      });

      this.logger.debug(
        {
          sub: payload.sub,
          iss: payload.iss,
          aud: payload.aud,
          exp: payload.exp,
        },
        'jwtVerify succeeded',
      );

      return payload;
    } catch (error) {
      // The real reason (bad signature, wrong iss/aud, expired, unknown kid,
      // ...) is exactly what jose's error message says — log it here since
      // JwtAuthGuard deliberately returns a generic 401 to the caller.
      this.logger.warn(
        { err: error as Error, issuer, audience: clientId },
        'jwtVerify failed',
      );
      throw error;
    }
  }

  private async getJwks(): Promise<RemoteJWKSet> {
    if (!this.jwks) {
      this.logger.debug('No cached JWKS resolver — running OIDC discovery');
      const jwksUri = await this.discoverJwksUri();
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
      this.logger.debug({ jwksUri }, 'JWKS resolver created and cached');
    } else {
      this.logger.debug('Reusing cached JWKS resolver');
    }

    return this.jwks;
  }

  private async discoverJwksUri(): Promise<string> {
    const { issuer } = this.config.sso;
    const discoveryUrl = new URL(
      OIDC_DISCOVERY_PATH,
      issuer.endsWith('/') ? issuer : `${issuer}/`,
    );

    this.logger.debug(
      { discoveryUrl: discoveryUrl.toString() },
      'Fetching OIDC discovery document',
    );

    const response = await fetch(discoveryUrl);
    if (!response.ok) {
      this.logger.warn(
        { discoveryUrl: discoveryUrl.toString(), status: response.status },
        'OIDC discovery request failed',
      );
      throw new Error(
        `OIDC discovery request to ${discoveryUrl.toString()} failed with status ${response.status}`,
      );
    }

    const document = (await response.json()) as OidcDiscoveryDocument;
    if (!document.jwks_uri) {
      this.logger.warn(
        { discoveryUrl: discoveryUrl.toString(), document },
        'OIDC discovery document is missing "jwks_uri"',
      );
      throw new Error(
        `OIDC discovery document at ${discoveryUrl.toString()} is missing "jwks_uri"`,
      );
    }

    this.logger.debug(
      { jwksUri: document.jwks_uri },
      'OIDC discovery succeeded',
    );

    return document.jwks_uri;
  }

  private preview(token: string): string {
    return token.length > 12
      ? `${token.slice(0, 12)}…(${token.length} chars)`
      : token;
  }
}
