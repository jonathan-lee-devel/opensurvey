import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { surveyQuestions, surveys } from '../../../../database/schema/index.js';
import {
  publicSurveySchema,
  surveySlugSchema,
} from './public-surveys.schema.js';

@ApiTags('surveys')
@Controller('public/surveys')
export class PublicSurveysController {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Get a published survey by its slug
   *
   * @remarks Returns the survey and its questions in display order. Drafts
   * and closed surveys are not visible here.
   */
  @Get(':slug')
  @ApiOkResponse({ standardSchema: publicSurveySchema })
  @ApiNotFoundResponse({ description: 'No published survey has this slug.' })
  async findBySlug(@Param('slug', { schema: surveySlugSchema }) slug: string) {
    const survey = await this.db.query.surveys.findFirst({
      columns: {
        id: true,
        title: true,
        description: true,
        slug: true,
        status: true,
      },
      where: and(eq(surveys.slug, slug), eq(surveys.status, 'published')),
      with: {
        questions: {
          columns: {
            id: true,
            type: true,
            prompt: true,
            required: true,
            position: true,
            options: true,
          },
          orderBy: asc(surveyQuestions.position),
        },
      },
    });
    if (!survey) throw new NotFoundException(`No published survey "${slug}"`);
    return survey;
  }
}
