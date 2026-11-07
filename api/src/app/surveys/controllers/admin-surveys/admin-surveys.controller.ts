import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AdminSurveysService } from '../../services/admin-surveys/admin-surveys.service.js';
import type { CreateSurveyDto } from './admin-surveys.schema.js';
import {
  adminSurveySchema,
  createSurveySchema,
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
}
