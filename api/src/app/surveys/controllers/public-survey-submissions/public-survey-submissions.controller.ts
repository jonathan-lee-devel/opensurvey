import { Body, Controller, Param, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ClientMetadata } from '../../../../common/client-metadata.decorator.js';
import { PublicSurveySubmissionsService } from '../../services/public-survey-submissions/public-survey-submissions.service.js';
import { surveySlugSchema } from '../public-surveys/public-surveys.schema.js';
import type { CreateSubmissionDto } from './public-survey-submissions.schema.js';
import {
  createSubmissionSchema,
  publicSubmissionSchema,
} from './public-survey-submissions.schema.js';

@ApiTags('surveys')
@Controller('public/surveys/:slug/submissions')
// A public write: no CacheInterceptor here, and a tighter rate limit than the
// default, per client IP.
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class PublicSurveySubmissionsController {
  constructor(private readonly submissions: PublicSurveySubmissionsService) {}

  /**
   * Submit answers to a published survey
   *
   * @remarks Records the answers with the client's IP address, user agent and
   * referer. Every request needs an `Idempotency-Key` header, unique per
   * attempt: a retry with the same key gets the first attempt's result back
   * (flagged `Idempotent-Replayed: true`) instead of a second submission, and
   * the same key with a different body is refused. Each question may be
   * answered once, and required questions must be answered.
   */
  @Post()
  @Idempotent({ required: true })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Unique per submission attempt (a UUID, say); retries resend the same key.',
  })
  @ApiCreatedResponse({ standardSchema: publicSubmissionSchema })
  @ApiBadRequestResponse({
    description: 'Malformed body, or no Idempotency-Key header.',
  })
  @ApiNotFoundResponse({ description: 'No published survey has this slug.' })
  @ApiConflictResponse({
    description:
      'A request with this Idempotency-Key is still being processed.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'An answer does not fit its question, a required question is unanswered, or the Idempotency-Key was used for a different request.',
  })
  create(
    @Param('slug', { schema: surveySlugSchema }) slug: string,
    @Body({ schema: createSubmissionSchema }) dto: CreateSubmissionDto,
    @ClientMetadata() client: ClientMetadata,
  ) {
    return this.submissions.create(slug, dto, client);
  }
}
