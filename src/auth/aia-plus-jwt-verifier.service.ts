import { Injectable } from '@nestjs/common';
import { CryptoKey, importSPKI, jwtVerify, JWTPayload } from 'jose';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { AIA_PLUS_JWT_ALG } from '../constants';
import { previewToken, safeDecodeClaims } from './token-debug.util';

/**
 * Verifies AIA+-issued JWTs against a fixed RSA public key (SPKI/PEM,
 * configured via AIA_PLUS_PUBLIC_KEY_PEM) — unlike JwtVerifierService, this
 * is a static key, not a remote JWKS: AIA+ hands us one public key directly
 * rather than exposing an OIDC discovery endpoint.
 *
 * The key is imported lazily (on first verify call, not at module boot) so
 * booting the app/test module graph never does the SPKI import on its own —
 * only actually verifying a token does. Once imported, it's cached for the
 * lifetime of the process.
 */
@Injectable()
export class AiaPlusJwtVerifierService {
  private publicKey?: CryptoKey;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiaPlusJwtVerifierService.name);
  }

  async verify(token: string): Promise<JWTPayload> {
    this.logger.debug(
      { tokenPreview: previewToken(token) },
      'Verifying AIA+ token',
    );

    const publicKey = await this.getPublicKey();

    try {
      const { payload } = await jwtVerify(token, publicKey);

      this.logger.debug(
        { sub: payload.sub, iss: payload.iss, exp: payload.exp },
        'jwtVerify succeeded',
      );

      return payload;
    } catch (error) {
      this.logger.warn({ err: error as Error }, 'jwtVerify failed');

      // Debug-only — see JwtVerifierService for why this isn't logged at warn.
      this.logger.debug(
        { tokenClaims: safeDecodeClaims(token) },
        'Unverified claims of the token that failed verification',
      );

      throw error;
    }
  }

  private async getPublicKey(): Promise<CryptoKey> {
    if (!this.publicKey) {
      this.logger.debug(
        'No cached public key — importing AIA_PLUS_PUBLIC_KEY_PEM',
      );

      try {
        this.publicKey = await importSPKI(
          this.config.aiaPlus.publicKeyPem,
          AIA_PLUS_JWT_ALG,
        );
        this.logger.debug('Public key imported and cached');
      } catch (error) {
        this.logger.warn(
          { err: error as Error },
          'Failed to import AIA+ public key from AIA_PLUS_PUBLIC_KEY_PEM — check its PEM formatting',
        );
        throw error;
      }
    } else {
      this.logger.debug('Reusing cached public key');
    }

    return this.publicKey;
  }
}
