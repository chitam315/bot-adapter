import { decodeJwt, importSPKI, jwtVerify } from 'jose';
import { PinoLogger } from 'nestjs-pino';
import { AppConfigService } from '../config/config.service';
import { AiaPlusJwtVerifierService } from './aia-plus-jwt-verifier.service';

jest.mock('jose', () => ({
  importSPKI: jest.fn(),
  jwtVerify: jest.fn(),
  decodeJwt: jest.fn(),
}));

describe('AiaPlusJwtVerifierService', () => {
  let service: AiaPlusJwtVerifierService;
  let config: AppConfigService;
  let logger: ReturnType<typeof buildLogger>;
  const fakePublicKey = { fake: 'public-key' };

  function buildLogger() {
    return { setContext: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  }

  beforeEach(() => {
    jest.mocked(importSPKI).mockClear();
    jest.mocked(jwtVerify).mockClear();
    jest.mocked(decodeJwt).mockClear();

    config = {
      aiaPlus: {
        publicKeyPem:
          '-----BEGIN PUBLIC KEY-----\ntest-key\n-----END PUBLIC KEY-----',
      },
    } as unknown as AppConfigService;

    jest.mocked(importSPKI).mockResolvedValue(fakePublicKey as never);
    jest
      .mocked(jwtVerify)
      .mockResolvedValue({ payload: { sub: 'user-1' } } as never);

    logger = buildLogger();
    service = new AiaPlusJwtVerifierService(
      config,
      logger as unknown as PinoLogger,
    );
  });

  it('imports the configured PEM as an RS256 public key and verifies the token against it', async () => {
    const payload = await service.verify('a.b.c');

    expect(importSPKI).toHaveBeenCalledWith(
      '-----BEGIN PUBLIC KEY-----\ntest-key\n-----END PUBLIC KEY-----',
      'RS256',
    );
    expect(jwtVerify).toHaveBeenCalledWith('a.b.c', fakePublicKey);
    expect(payload).toEqual({ sub: 'user-1' });
  });

  it('caches the imported public key across calls', async () => {
    await service.verify('a.b.c');
    await service.verify('d.e.f');

    expect(importSPKI).toHaveBeenCalledTimes(1);
    expect(jwtVerify).toHaveBeenCalledTimes(2);
  });

  it('propagates and logs importSPKI failures (e.g. malformed PEM)', async () => {
    const pemError = new Error('Invalid PEM');
    jest.mocked(importSPKI).mockRejectedValue(pemError);

    await expect(service.verify('a.b.c')).rejects.toThrow('Invalid PEM');
    expect(logger.warn).toHaveBeenCalledWith(
      { err: pemError },
      'Failed to import AIA+ public key from AIA_PLUS_PUBLIC_KEY_PEM — check its PEM formatting',
    );
  });

  it('propagates jwtVerify failures and debug-logs the unverified claims', async () => {
    const verifyError = new Error('signature verification failed');
    jest.mocked(jwtVerify).mockRejectedValue(verifyError);
    jest.mocked(decodeJwt).mockReturnValue({ sub: 'user-1' });

    await expect(service.verify('a.b.c')).rejects.toThrow(
      'signature verification failed',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      { err: verifyError },
      'jwtVerify failed',
    );
    expect(logger.debug).toHaveBeenCalledWith(
      { tokenClaims: { sub: 'user-1' } },
      'Unverified claims of the token that failed verification',
    );
  });
});
