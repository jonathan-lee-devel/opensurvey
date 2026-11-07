import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicSurveysController } from './public-surveys.controller.js';

describe('PublicSurveysController', () => {
  let controller: PublicSurveysController;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicSurveysController],
      providers: [
        {
          provide: getDrizzleToken(),
          useValue: { query: { surveys: { findFirst } } },
        },
      ],
    }).compile();

    controller = module.get<PublicSurveysController>(PublicSurveysController);
  });

  it('returns the survey the database finds', async () => {
    const survey = { id: '1', slug: 'feedback', questions: [] };
    findFirst.mockResolvedValue(survey);
    await expect(controller.findBySlug('feedback')).resolves.toBe(survey);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('answers 404 when no published survey has the slug', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(controller.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
