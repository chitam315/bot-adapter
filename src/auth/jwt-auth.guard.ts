import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JWTPayload } from 'jose';
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
 * expired token, bad signature, wrong audience) is swallowed here.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtVerifierService: JwtVerifierService,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[this.config.sso.cookieName] as
      string | undefined;

    if (!token) {
      throw new UnauthorizedException('Missing auth cookie');
    }

    try {
      request.user = await this.jwtVerifierService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return true;
  }
}
