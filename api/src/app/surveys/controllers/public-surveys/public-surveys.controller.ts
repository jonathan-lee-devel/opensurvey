import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { IsPublic } from '../../../../auth/decorators/is-public.decorator.js';
import { PublicSurveysService } from '../../services/public-surveys/public-surveys.service.js';
import {
  publicSurveySchema,
  surveySlugSchema,
} from './public-surveys.schema.js';

@ApiTags('surveys')
@Controller('public/surveys')
@IsPublic()
@UseInterceptors(CacheInterceptor)
export class PublicSurveysController {
  constructor(private readonly publicSurveys: PublicSurveysService) {}

  /**
   * Get a published survey by its slug
   *
   * @remarks Returns the survey and its questions in display order. Drafts
   * and closed surveys are not visible here.
   */
  @Get(':slug')
  @ApiOkResponse({ standardSchema: publicSurveySchema })
  @ApiNotFoundResponse({ description: 'No published survey has this slug.' })
  findBySlug(@Param('slug', { schema: surveySlugSchema }) slug: string) {
    return this.publicSurveys.findBySlug(slug);
  }
}
