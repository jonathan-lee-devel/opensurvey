import { TestBed } from '@suites/unit';

import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import { AdminSurveysController } from './admin-surveys.controller.js';
import { CreateSurveyDto } from './admin-surveys.schema.js';

describe('AdminSurveysController', () => {
  it('delegates to the service and returns its result', async () => {
    const dto: CreateSurveyDto = {
      ownerId: '11111111-1111-4111-8111-111111111111',
      title: 'Feedback',
      description: null,
      slug: 'feedback',
      status: 'draft',
      questions: [{ type: 'short_text', prompt: 'Name?', required: false }],
    };
    const survey = { id: 's1', ...dto };
    const { unit, unitRef } = await TestBed.solitary(AdminSurveysController)
      .mock(AdminSurveysService)
      .impl((stub) => ({ create: stub().mockResolvedValue(survey) }))
      .compile();

    await expect(unit.create(dto)).resolves.toBe(survey);
    expect(unitRef.get(AdminSurveysService).create).toHaveBeenCalledWith(dto);
  });
});
