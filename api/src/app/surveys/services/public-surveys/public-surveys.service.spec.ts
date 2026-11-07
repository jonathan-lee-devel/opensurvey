import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicSurveysService } from './public-surveys.service.js';

describe('PublicSurveysService', () => {
  let service: PublicSurveysService;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicSurveysService,
        {
          provide: getDrizzleToken(),
          useValue: { query: { surveys: { findFirst } } },
        },
      ],
    }).compile();

    service = module.get<PublicSurveysService>(PublicSurveysService);
  });

  it('returns the survey the database finds', async () => {
    const survey = { id: '1', slug: 'feedback', questions: [] };
    findFirst.mockResolvedValue(survey);
    await expect(service.findBySlug('feedback')).resolves.toBe(survey);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no published survey has the slug', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
