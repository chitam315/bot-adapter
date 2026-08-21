import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JWTPayload } from 'jose';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { AiaPlusJwtVerifierService } from './aia-plus-jwt-verifier.service';

export interface AiaPlusAuthenticatedRequest extends Request {
  aiaPlusUser?: JWTPayload;
}

/**
 * AIA+ integration guard. Reads the token from the configured
 * AIA_PLUS_COOKIE_NAME cookie (separate from SSO_COOKIE_NAME — this is a
 * different identity source, hence a different guard/cookie/request field,
 * not a reuse of JwtAuthGuard) and verifies it via AiaPlusJwtVerifierService's
 * static RSA public key. Verification failures are logged with detail (see
 * the verifier service) but only ever surfaced to the caller as a generic 401.
 */
@Injectable()
export class AiaPlusAuthGuard implements CanActivate {
  constructor(
    private readonly verifier: AiaPlusJwtVerifierService,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiaPlusAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AiaPlusAuthenticatedRequest>();
    const cookieName = this.config.aiaPlus.cookieName;
    const token = request.cookies?.[cookieName] as string | undefined;

    if (!token) {
      this.logger.warn(
        {
          cookieName,
          cookiesPresent: Object.keys(request.cookies ?? {}),
        },
        'AIA+ auth cookie missing from request',
      );
      throw new UnauthorizedException('Missing auth cookie');
    }

    try {
      request.aiaPlusUser = await this.verifier.verify(token);
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'AIA+ token verification failed — rejecting request',
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.debug(
      { sub: request.aiaPlusUser?.sub },
      'AIA+ request authorized',
    );
    return true;
  }
}
