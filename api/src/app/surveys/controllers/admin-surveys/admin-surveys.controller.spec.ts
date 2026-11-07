import { Test, TestingModule } from '@nestjs/testing';

import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import { AdminSurveysController } from './admin-surveys.controller.js';
import { CreateSurveyDto } from './admin-surveys.schema.js';

describe('AdminSurveysController', () => {
  let controller: AdminSurveysController;
  const create = vi.fn();

  beforeEach(async () => {
    create.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSurveysController],
      providers: [{ provide: AdminSurveysService, useValue: { create } }],
    }).compile();

    controller = module.get<AdminSurveysController>(AdminSurveysController);
  });

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
    create.mockResolvedValue(survey);
    await expect(controller.create(dto)).resolves.toBe(survey);
    expect(create).toHaveBeenCalledWith(dto);
  });
});
