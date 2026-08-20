import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';
import { JwtVerifierService } from './jwt-verifier.service';

describe('JwtAuthGuard', () => {
  const buildContext = (request: Partial<AuthenticatedRequest>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  const config = {
    sso: {
      issuer: 'https://sso.example.com',
      clientId: 'c',
      cookieName: 'idToken',
    },
  } as unknown as AppConfigService;

  it('rejects when the auth cookie is missing', async () => {
    const verify = jest.fn();
    const guard = new JwtAuthGuard(
      { verify } as unknown as JwtVerifierService,
      config,
    );
    const context = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects when verification fails, without leaking the underlying error', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('bad signature'));
    const guard = new JwtAuthGuard(
      { verify } as unknown as JwtVerifierService,
      config,
    );
    const context = buildContext({ cookies: { idToken: 'bad.token.here' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).toHaveBeenCalledWith('bad.token.here');
  });

  it('allows the request through and attaches the payload as request.user on success', async () => {
    const payload = { sub: 'user-1' };
    const verify = jest.fn().mockResolvedValue(payload);
    const guard = new JwtAuthGuard(
      { verify } as unknown as JwtVerifierService,
      config,
    );
    const request = {
      cookies: { idToken: 'good.token.here' },
    } as unknown as AuthenticatedRequest;
    const context = buildContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(payload);
  });
});
