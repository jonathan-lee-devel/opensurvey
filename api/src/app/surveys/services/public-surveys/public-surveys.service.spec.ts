import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import type { Mocked } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { PublicSurveysService } from './public-surveys.service.js';

describe('PublicSurveysService', () => {
  let service: PublicSurveysService;
  let db: Mocked<Database>;

  beforeEach(async () => {
    const { unit, unitRef } =
      await TestBed.solitary(PublicSurveysService).compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
  });

  it('returns the survey the database finds', async () => {
    const survey = { id: '1', slug: 'feedback', questions: [] };
    db.query.surveys.findFirst.mockResolvedValue(survey as never);

    await expect(service.findBySlug('feedback')).resolves.toBe(survey);
    expect(db.query.surveys.findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no published survey has the slug', async () => {
    db.query.surveys.findFirst.mockResolvedValue(undefined);

    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
