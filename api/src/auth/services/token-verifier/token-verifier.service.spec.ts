import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestBed } from '@suites/unit';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWK, JWTPayload, JWTVerifyGetKey } from 'jose';

import { AUTH_KEY_SET } from '../../auth.constants.js';
import { TokenVerifierService } from './token-verifier.service.js';

const ISSUER = 'https://issuer.test';
const AUDIENCE = 'opensurvey-api';

describe('TokenVerifierService', () => {
  let privateKey: CryptoKey;
  let strangerKey: CryptoKey;
  let keySet: JWTVerifyGetKey;

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    const stranger = await generateKeyPair('ES256');
    strangerKey = stranger.privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'k1' };
    // Same contract as the remote key set AuthModule builds, minus the fetch.
    keySet = createLocalJWKSet({ keys: [jwk] });
  });

  async function build(
    env: Record<string, string | undefined> = {
      AUTH_ISSUER: ISSUER,
      AUTH_AUDIENCE: AUDIENCE,
    },
  ) {
    const { unit } = await TestBed.solitary(TokenVerifierService)
      .mock(ConfigService)
      .impl((stub) => ({
        get: stub().mockImplementation((name: string) => env[name]),
        getOrThrow: stub().mockImplementation((name: string) => env[name]),
      }))
      .mock<JWTVerifyGetKey>(AUTH_KEY_SET)
      .final(keySet)
      .compile();
    return unit;
  }

  function token(
    claims: JWTPayload = {},
    options: { key?: CryptoKey; alg?: string; kid?: string } = {},
  ) {
    return new SignJWT({ sub: 'user-1', iss: ISSUER, aud: AUDIENCE, ...claims })
      .setProtectedHeader({
        alg: options.alg ?? 'ES256',
        kid: options.kid ?? 'k1',
      })
      .setIssuedAt()
      .setExpirationTime(claims.exp ?? '5m')
      .sign(options.key ?? privateKey);
  }

  it('returns the subject and every claim of a valid token', async () => {
    const verifier = await build();
    const user = await verifier.verify(
      await token({ roles: ['azg12345_SurveyAdmin'] }),
    );
    expect(user.subject).toBe('user-1');
    expect(user.claims).toMatchObject({
      sub: 'user-1',
      iss: ISSUER,
      aud: AUDIENCE,
      roles: ['azg12345_SurveyAdmin'],
    });
  });

  it('skips the audience check when AUTH_AUDIENCE is unset', async () => {
    const verifier = await build({ AUTH_ISSUER: ISSUER });
    await expect(
      verifier.verify(await token({ aud: 'someone-else' })),
    ).resolves.toMatchObject({ subject: 'user-1' });
  });

  it('rejects a token signed by a key outside the set', async () => {
    const verifier = await build();
    await expect(
      verifier.verify(await token({}, { key: strangerKey, kid: 'k2' })),
    ).rejects.toThrow('Token was not signed by a known key');
  });

  it('rejects a forged signature under a known kid', async () => {
    const verifier = await build();
    await expect(
      verifier.verify(await token({}, { key: strangerKey })),
    ).rejects.toThrow('Token is invalid');
  });

  it('rejects an expired token', async () => {
    const verifier = await build();
    await expect(
      verifier.verify(await token({ exp: Math.floor(Date.now() / 1000) - 60 })),
    ).rejects.toThrow('Token has expired');
  });

  it('rejects the wrong issuer or audience, naming the claim', async () => {
    const verifier = await build();
    await expect(
      verifier.verify(await token({ iss: 'https://evil.test' })),
    ).rejects.toThrow(/claim "iss"/);
    await expect(
      verifier.verify(await token({ aud: 'another-api' })),
    ).rejects.toThrow(/claim "aud"/);
  });

  it('requires a subject', async () => {
    const verifier = await build();
    const noSubject = await new SignJWT({ iss: ISSUER, aud: AUDIENCE })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setExpirationTime('5m')
      .sign(privateKey);
    await expect(verifier.verify(noSubject)).rejects.toThrow(/claim "sub"/);
  });

  it('rejects garbage with a 401', async () => {
    const verifier = await build();
    const failure = verifier.verify('not.a.jwt');
    await expect(failure).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(failure).rejects.toThrow('Token is invalid');
  });
});
