import { Test, TestingModule } from '@nestjs/testing';

import { PublicSurveysController } from './public-surveys.controller.js';

describe('PublicSurveysController', () => {
  let controller: PublicSurveysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSurveysController],
    }).compile();

    controller = module.get<PublicSurveysController>(PublicSurveysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
