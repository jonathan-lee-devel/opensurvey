import { Module } from '@nestjs/common';

import { AdminSurveysController } from './controllers/admin-surveys/admin-surveys.controller.js';
import { PublicSurveySubmissionsController } from './controllers/public-survey-submissions/public-survey-submissions.controller.js';
import { PublicSurveysController } from './controllers/public-surveys/public-surveys.controller.js';
import { AdminSurveysService } from './services/admin-surveys/admin-surveys.service.js';
import { PublicSurveySubmissionsService } from './services/public-survey-submissions/public-survey-submissions.service.js';
import { PublicSurveysService } from './services/public-surveys/public-surveys.service.js';

@Module({
  controllers: [
    PublicSurveysController,
    PublicSurveySubmissionsController,
    AdminSurveysController,
  ],
  providers: [
    PublicSurveysService,
    PublicSurveySubmissionsService,
    AdminSurveysService,
  ],
})
export class SurveysModule {}
