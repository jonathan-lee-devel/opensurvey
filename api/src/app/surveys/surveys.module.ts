import { Module } from '@nestjs/common';

import { AdminSurveysController } from './controllers/admin-surveys/admin-surveys.controller.js';
import { PublicSurveysController } from './controllers/public-surveys/public-surveys.controller.js';
import { AdminSurveysService } from './services/admin-surveys/admin-surveys.service.js';
import { PublicSurveysService } from './services/public-surveys/public-surveys.service.js';

@Module({
  controllers: [PublicSurveysController, AdminSurveysController],
  providers: [PublicSurveysService, AdminSurveysService],
})
export class SurveysModule {}
