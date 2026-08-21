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
import { JwtVerifierService } from './jwt-verifier.service';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Reads the SSO-issued JWT from the configured cookie (not the
 * `Authorization` header) and verifies it against the SSO issuer's JWKS via
 * `JwtVerifierService`. Verification failures are never surfaced to the
 * caller beyond "unauthorized" — the underlying error (network failure,
 * expired token, bad signature, wrong audience) is logged here instead,
 * since JwtVerifierService already logs the jose-level detail.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtVerifierService: JwtVerifierService,
    private readonly config: AppConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JwtAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = this.config.sso.cookieName;
    const token = request.cookies?.[cookieName] as string | undefined;

    if (!token) {
      this.logger.warn(
        { cookieName, cookiesPresent: Object.keys(request.cookies ?? {}) },
        'Auth cookie missing from request',
      );
      throw new UnauthorizedException('Missing auth cookie');
    }

    try {
      request.user = await this.jwtVerifierService.verify(token);
    } catch (error) {
      this.logger.warn(
        { err: error as Error },
        'JWT verification failed — rejecting request',
      );
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.debug({ sub: request.user?.sub }, 'Request authorized');
    return true;
  }
}
