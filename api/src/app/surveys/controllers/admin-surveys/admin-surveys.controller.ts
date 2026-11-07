import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import type {
  CreateSurveyDto,
  ListSubmissionsQuery,
} from './admin-surveys.schema.js';
import {
  adminSubmissionListSchema,
  adminSurveySchema,
  createSurveySchema,
  listSubmissionsQuerySchema,
  surveyIdSchema,
} from './admin-surveys.schema.js';

@ApiTags('surveys')
@Controller('admin/surveys')
export class AdminSurveysController {
  constructor(private readonly adminSurveys: AdminSurveysService) {}

  /**
   * Create a survey with its questions
   *
   * @remarks Questions keep the order given. Choice questions need options;
   * other types must not have them. The survey starts as a draft unless a
   * status is supplied.
   */
  @Post()
  @ApiCreatedResponse({ standardSchema: adminSurveySchema })
  @ApiConflictResponse({ description: 'A survey with this slug exists.' })
  @ApiUnprocessableEntityResponse({ description: 'The owner does not exist.' })
  create(@Body({ schema: createSurveySchema }) dto: CreateSurveyDto) {
    return this.adminSurveys.create(dto);
  }

  /**
   * List a survey's submissions
   *
   * @remarks Newest first, each with the request metadata it was recorded
   * with (IP address, user agent, referer) and its answers. Page with `limit`
   * (1 to 200, default 50) and `offset`; `total` counts every submission to
   * the survey. Drafts and closed surveys are listed too.
   */
  @Get(':id/submissions')
  @ApiOkResponse({ standardSchema: adminSubmissionListSchema })
  @ApiNotFoundResponse({ description: 'No survey has this id.' })
  listSubmissions(
    @Param('id', { schema: surveyIdSchema }) id: string,
    @Query({ schema: listSubmissionsQuerySchema }) query: ListSubmissionsQuery,
  ) {
    return this.adminSurveys.listSubmissions(id, query);
  }
}
