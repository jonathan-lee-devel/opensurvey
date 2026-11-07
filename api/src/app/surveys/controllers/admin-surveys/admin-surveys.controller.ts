import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { SURVEY_ADMIN_CLAIM } from '../../../../auth/auth.constants.js';
import { HasClaim } from '../../../../auth/decorators/has-claim.decorator.js';
import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import type {
  CreateSurveyDto,
  ListSubmissionsQuery,
  ListSurveysQuery,
  UpdateSurveyDto,
} from './admin-surveys.schema.js';
import {
  adminSubmissionListSchema,
  adminSurveyListSchema,
  adminSurveySchema,
  createSurveySchema,
  listSubmissionsQuerySchema,
  listSurveysQuerySchema,
  surveyIdSchema,
  updateSurveySchema,
} from './admin-surveys.schema.js';

@ApiTags('surveys')
@Controller('admin/surveys')
// Needs a Bearer token (AuthGuard, the default) holding the admin claim.
@HasClaim(SURVEY_ADMIN_CLAIM)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({
  description: `The token does not hold the ${SURVEY_ADMIN_CLAIM} claim.`,
})
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
   * Update a survey's title, description, slug or status
   *
   * @remarks Send only the fields to change. Publishing makes the survey
   * readable at its public link; closing or renaming the slug takes effect
   * there at once, the cached public response is dropped. Questions cannot be
   * changed once a survey exists.
   */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: adminSurveySchema })
  @ApiNotFoundResponse({ description: 'No survey has this id.' })
  @ApiConflictResponse({ description: 'A survey with this slug exists.' })
  update(
    @Param('id', { schema: surveyIdSchema }) id: string,
    @Body({ schema: updateSurveySchema }) dto: UpdateSurveyDto,
  ) {
    return this.adminSurveys.update(id, dto);
  }

  /**
   * Delete a survey
   *
   * @remarks Removes the survey with its questions, submissions and answers,
   * and drops its cached public response.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'The survey is gone.' })
  @ApiNotFoundResponse({ description: 'No survey has this id.' })
  async remove(@Param('id', { schema: surveyIdSchema }) id: string) {
    await this.adminSurveys.remove(id);
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
