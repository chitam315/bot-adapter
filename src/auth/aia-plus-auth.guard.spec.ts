import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import {
  AiaPlusAuthenticatedRequest,
  AiaPlusAuthGuard,
} from './aia-plus-auth.guard';
import { AiaPlusJwtVerifierService } from './aia-plus-jwt-verifier.service';

describe('AiaPlusAuthGuard', () => {
  const buildContext = (request: Partial<AiaPlusAuthenticatedRequest>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  const buildLogger = () =>
    ({
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    }) as unknown as PinoLogger;

  const config = {
    aiaPlus: { cookieName: 'myaiaAccessToken' },
  } as unknown as AppConfigService;

  it('rejects when the myaiaAccessToken cookie is missing', async () => {
    const verify = jest.fn();
    const guard = new AiaPlusAuthGuard(
      { verify } as unknown as AiaPlusJwtVerifierService,
      config,
      buildLogger(),
    );
    const context = buildContext({ cookies: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects when verification fails, without leaking the underlying error', async () => {
    const verify = jest.fn().mockRejectedValue(new Error('bad signature'));
    const guard = new AiaPlusAuthGuard(
      { verify } as unknown as AiaPlusJwtVerifierService,
      config,
      buildLogger(),
    );
    const context = buildContext({
      cookies: { myaiaAccessToken: 'bad.token.here' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verify).toHaveBeenCalledWith('bad.token.here');
  });

  it('allows the request through and attaches the payload as request.aiaPlusUser on success', async () => {
    const payload = { sub: 'user-1' };
    const verify = jest.fn().mockResolvedValue(payload);
    const guard = new AiaPlusAuthGuard(
      { verify } as unknown as AiaPlusJwtVerifierService,
      config,
      buildLogger(),
    );
    const request = {
      cookies: { myaiaAccessToken: 'good.token.here' },
    } as unknown as AiaPlusAuthenticatedRequest;
    const context = buildContext(request);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.aiaPlusUser).toEqual(payload);
  });
});
