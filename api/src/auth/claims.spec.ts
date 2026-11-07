import { hasClaim } from './claims.js';

describe('hasClaim', () => {
  it('finds a claim that is a key of the payload', () => {
    expect(
      hasClaim({ azg12345_SurveyAdmin: true }, 'azg12345_SurveyAdmin'),
    ).toBe(true);
    expect(hasClaim({ tenant: 'acme' }, 'tenant')).toBe(true);
    expect(hasClaim({ level: 0 }, 'level')).toBe(true);
  });

  it('ignores a key whose value says it is absent', () => {
    expect(
      hasClaim({ azg12345_SurveyAdmin: false }, 'azg12345_SurveyAdmin'),
    ).toBe(false);
    expect(hasClaim({ tenant: null }, 'tenant')).toBe(false);
    expect(hasClaim({ tenant: '' }, 'tenant')).toBe(false);
    expect(hasClaim({}, 'tenant')).toBe(false);
  });

  it('finds a claim listed in a roles, groups or permissions array', () => {
    expect(
      hasClaim(
        { roles: ['reader', 'azg12345_SurveyAdmin'] },
        'azg12345_SurveyAdmin',
      ),
    ).toBe(true);
    expect(
      hasClaim({ groups: ['azg12345_SurveyAdmin'] }, 'azg12345_SurveyAdmin'),
    ).toBe(true);
    expect(hasClaim({ permissions: ['surveys:write'] }, 'surveys:write')).toBe(
      true,
    );
    expect(hasClaim({ roles: ['reader'] }, 'azg12345_SurveyAdmin')).toBe(false);
  });

  it('finds a claim in a space-separated scope string', () => {
    expect(hasClaim({ scope: 'openid surveys:read' }, 'surveys:read')).toBe(
      true,
    );
    expect(hasClaim({ scp: 'surveys:read' }, 'surveys:read')).toBe(true);
    expect(hasClaim({ scope: 'openid surveys:readonly' }, 'surveys:read')).toBe(
      false,
    );
  });

  it('does not look inside other claims', () => {
    expect(
      hasClaim(
        { memberships: ['azg12345_SurveyAdmin'] },
        'azg12345_SurveyAdmin',
      ),
    ).toBe(false);
  });
});
