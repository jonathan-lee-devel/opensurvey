import { Test, TestingModule } from '@nestjs/testing';

import { PublicSurveysService } from '../../services/public-surveys/public-surveys.service.js';
import { PublicSurveysController } from './public-surveys.controller.js';

describe('PublicSurveysController', () => {
  let controller: PublicSurveysController;
  const findBySlug = vi.fn();

  beforeEach(async () => {
    findBySlug.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSurveysController],
      providers: [{ provide: PublicSurveysService, useValue: { findBySlug } }],
    }).compile();

    controller = module.get<PublicSurveysController>(PublicSurveysController);
  });

  it('delegates to the service and returns its result', async () => {
    const survey = { id: '1', slug: 'feedback', questions: [] };
    findBySlug.mockResolvedValue(survey);
    await expect(controller.findBySlug('feedback')).resolves.toBe(survey);
    expect(findBySlug).toHaveBeenCalledWith('feedback');
  });
});
