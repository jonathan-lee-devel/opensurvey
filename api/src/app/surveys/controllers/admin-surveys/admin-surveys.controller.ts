import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import type {
  CreateSurveyDto,
  ListSubmissionsQuery,
  ListSurveysQuery,
} from './admin-surveys.schema.js';
import {
  adminSubmissionListSchema,
  adminSurveyListSchema,
  adminSurveySchema,
  createSurveySchema,
  listSubmissionsQuerySchema,
  listSurveysQuerySchema,
  surveyIdSchema,
} from './admin-surveys.schema.js';

@ApiTags('surveys')
@Controller('admin/surveys')
// Needs a Bearer token (AuthGuard, the default); documented for Swagger UI.
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
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
   * List surveys
   *
   * @remarks Newest first, without their questions. Page with `limit` (1 to
   * 200, default 50) and `offset`; filter with `status` to see only drafts,
   * published or closed surveys. `total` counts every survey matching the
   * filter.
   */
  @Get()
  @ApiOkResponse({ standardSchema: adminSurveyListSchema })
  list(@Query({ schema: listSurveysQuerySchema }) query: ListSurveysQuery) {
    return this.adminSurveys.list(query);
  }

  /**
   * Get a survey by its id
   *
   * @remarks Returns the survey with its owner and its questions in display
   * order. Drafts and closed surveys are returned too.
   */
  @Get(':id')
  @ApiOkResponse({ standardSchema: adminSurveySchema })
  @ApiNotFoundResponse({ description: 'No survey has this id.' })
  findById(@Param('id', { schema: surveyIdSchema }) id: string) {
    return this.adminSurveys.findById(id);
  }

  /**
   * List a survey's submissions
   *
   * @remarks Newest first, each with the request metadata it was recorded
   * with (IP address, user agent, referer) and its answers. Each answer
   * carries the full question it answers (`question`, with its id, type,
   * prompt, required flag, position and options) rather than a bare id, in
   * the survey's question order. Page with `limit`
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
