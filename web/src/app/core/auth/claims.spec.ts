import { decodeJwtPayload, hasClaim } from './claims';

describe('hasClaim', () => {
  it('finds a claim that is a key of the payload', () => {
    expect(hasClaim({ azg12345_SurveyAdmin: true }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ azg12345_SurveyAdmin: 'yes' }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ azg12345_SurveyAdmin: 1 }, 'azg12345_SurveyAdmin')).toBe(true);
  });

  it('ignores a key whose value says it is absent', () => {
    expect(hasClaim({ azg12345_SurveyAdmin: false }, 'azg12345_SurveyAdmin')).toBe(false);
    expect(hasClaim({ azg12345_SurveyAdmin: null }, 'azg12345_SurveyAdmin')).toBe(false);
    expect(hasClaim({ azg12345_SurveyAdmin: '' }, 'azg12345_SurveyAdmin')).toBe(false);
    expect(hasClaim({}, 'azg12345_SurveyAdmin')).toBe(false);
  });

  it('finds a claim listed in a roles, groups or permissions array', () => {
    expect(hasClaim({ roles: ['other', 'azg12345_SurveyAdmin'] }, 'azg12345_SurveyAdmin')).toBe(
      true,
    );
    expect(hasClaim({ groups: ['azg12345_SurveyAdmin'] }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ permissions: ['azg12345_SurveyAdmin'] }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ roles: ['other'] }, 'azg12345_SurveyAdmin')).toBe(false);
  });

  it('finds a claim in a space-separated scope string', () => {
    expect(hasClaim({ scope: 'openid azg12345_SurveyAdmin' }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ scp: 'azg12345_SurveyAdmin' }, 'azg12345_SurveyAdmin')).toBe(true);
    expect(hasClaim({ scope: 'openid' }, 'azg12345_SurveyAdmin')).toBe(false);
  });

  it('does not look inside other claims', () => {
    expect(
      hasClaim({ realm_access: { roles: ['azg12345_SurveyAdmin'] } }, 'azg12345_SurveyAdmin'),
    ).toBe(false);
    expect(hasClaim({ name: 'azg12345_SurveyAdmin' }, 'azg12345_SurveyAdmin')).toBe(false);
  });
});

describe('decodeJwtPayload', () => {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  it('decodes the base64url payload without verifying the signature', () => {
    const token = `${encode({ alg: 'ES256' })}.${encode({ sub: 'abc', roles: ['x'] })}.sig`;
    expect(decodeJwtPayload(token)).toEqual({ sub: 'abc', roles: ['x'] });
  });

  it('returns null for anything that is not a three-part JWT', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('opaque-token')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});
