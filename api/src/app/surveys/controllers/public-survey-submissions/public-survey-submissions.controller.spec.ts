import { CacheInterceptor } from '@nestjs/cache-manager';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants.js';
import { TestBed } from '@suites/unit';

import type { ClientMetadata } from '../../../../common/client-metadata.decorator.js';
import { PublicSurveySubmissionsService } from '../../services/public-survey-submissions/public-survey-submissions.service.js';
import { PublicSurveySubmissionsController } from './public-survey-submissions.controller.js';
import type { CreateSubmissionDto } from './public-survey-submissions.schema.js';

describe('PublicSurveySubmissionsController', () => {
  it('delegates to the service with the slug, body and client metadata', async () => {
    const dto: CreateSubmissionDto = {
      answers: [
        { questionId: '11111111-1111-4111-8111-111111111111', value: 'Ada' },
      ],
    };
    const client: ClientMetadata = {
      ipAddress: '203.0.113.7',
      userAgent: 'curl/8.0',
      referer: null,
    };
    const submission = { id: 'sub1', surveyId: 's1', submittedAt: 'now' };
    const { unit, unitRef } = await TestBed.solitary(
      PublicSurveySubmissionsController,
    )
      .mock(PublicSurveySubmissionsService)
      .impl((stub) => ({ create: stub().mockResolvedValue(submission) }))
      .compile();

    await expect(unit.create('feedback', dto, client)).resolves.toBe(
      submission,
    );
    expect(
      unitRef.get(PublicSurveySubmissionsService).create,
    ).toHaveBeenCalledWith('feedback', dto, client);
  });

  it('is not cached: a write never goes through CacheInterceptor', () => {
    const interceptors: unknown[] | undefined = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      PublicSurveySubmissionsController,
    );
    expect(interceptors ?? []).not.toContain(CacheInterceptor);
  });
});
