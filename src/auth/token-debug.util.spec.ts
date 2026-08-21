import { decodeJwt } from 'jose';
import { previewToken, safeDecodeClaims } from './token-debug.util';

jest.mock('jose', () => ({ decodeJwt: jest.fn() }));

describe('previewToken', () => {
  it('returns the token as-is when 12 characters or shorter', () => {
    expect(previewToken('short')).toBe('short');
  });

  it('truncates longer tokens to a preview with a length suffix', () => {
    const token = 'a.b.c'.padEnd(50, 'x');

    expect(previewToken(token)).toBe(
      `${token.slice(0, 12)}…(${token.length} chars)`,
    );
  });
});

describe('safeDecodeClaims', () => {
  beforeEach(() => {
    jest.mocked(decodeJwt).mockReset();
  });

  it('returns the decoded claims on success', () => {
    jest.mocked(decodeJwt).mockReturnValue({ sub: 'user-1' });

    expect(safeDecodeClaims('a.b.c')).toEqual({ sub: 'user-1' });
  });

  it('returns an explanatory string instead of throwing when decoding fails', () => {
    jest.mocked(decodeJwt).mockImplementation(() => {
      throw new Error('Invalid Compact JWS');
    });

    expect(safeDecodeClaims('not-a-jwt')).toBe(
      'unable to decode token: Invalid Compact JWS',
    );
  });
});
