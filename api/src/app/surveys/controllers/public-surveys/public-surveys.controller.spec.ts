import { TestBed } from '@suites/unit';

import { PublicSurveysService } from '../../services/public-surveys/public-surveys.service.js';
import { PublicSurveysController } from './public-surveys.controller.js';

describe('PublicSurveysController', () => {
  it('delegates to the service and returns its result', async () => {
    const survey = { id: '1', slug: 'feedback', questions: [] };
    const { unit, unitRef } = await TestBed.solitary(PublicSurveysController)
      .mock(PublicSurveysService)
      .impl((stub) => ({ findBySlug: stub().mockResolvedValue(survey) }))
      .compile();

    await expect(unit.findBySlug('feedback')).resolves.toBe(survey);
    expect(unitRef.get(PublicSurveysService).findBySlug).toHaveBeenCalledWith(
      'feedback',
    );
  });
});
