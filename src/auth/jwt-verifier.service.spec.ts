import { createRemoteJWKSet, jwtVerify } from 'jose';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { JwtVerifierService } from './jwt-verifier.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

describe('JwtVerifierService', () => {
  let service: JwtVerifierService;
  let config: AppConfigService;
  let fetchMock: jest.Mock;
  const fakeJwks = { fake: 'jwks' };

  const buildLogger = () =>
    ({
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    }) as unknown as PinoLogger;

  beforeEach(() => {
    jest.mocked(createRemoteJWKSet).mockClear();
    jest.mocked(jwtVerify).mockClear();

    config = {
      sso: {
        issuer: 'https://sso.example.com',
        clientId: 'client-123',
        cookieName: 'idToken',
      },
    } as unknown as AppConfigService;

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          jwks_uri: 'https://sso.example.com/.well-known/jwks.json',
        }),
    });
    global.fetch = fetchMock;

    jest.mocked(createRemoteJWKSet).mockReturnValue(fakeJwks as never);
    jest
      .mocked(jwtVerify)
      .mockResolvedValue({ payload: { sub: 'user-1' } } as never);

    service = new JwtVerifierService(config, buildLogger());
  });

  it('discovers the JWKS URI from the issuer and verifies the token against it', async () => {
    const payload = await service.verify('a.b.c');

    expect(fetchMock).toHaveBeenCalledWith(
      new URL('https://sso.example.com/.well-known/openid-configuration'),
    );
    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://sso.example.com/.well-known/jwks.json'),
    );
    expect(jwtVerify).toHaveBeenCalledWith('a.b.c', fakeJwks, {
      issuer: 'https://sso.example.com',
      audience: 'client-123',
    });
    expect(payload).toEqual({ sub: 'user-1' });
  });

  it('caches the JWKS across calls — discovery only runs once', async () => {
    await service.verify('a.b.c');
    await service.verify('d.e.f');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
    expect(jwtVerify).toHaveBeenCalledTimes(2);
  });

  it('rejects when the discovery request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(service.verify('a.b.c')).rejects.toThrow(
      /OIDC discovery request .* failed with status 503/,
    );
  });

  it('rejects when the discovery document has no jwks_uri', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    await expect(service.verify('a.b.c')).rejects.toThrow(/jwks_uri/);
  });

  it('propagates jwtVerify failures (e.g. expired/invalid token)', async () => {
    jest
      .mocked(jwtVerify)
      .mockRejectedValue(new Error('signature verification failed'));

    await expect(service.verify('a.b.c')).rejects.toThrow(
      'signature verification failed',
    );
  });
});
