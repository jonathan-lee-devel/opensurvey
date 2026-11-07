import { Module } from '@nestjs/common';

import { PublicSurveysController } from './controllers/public-surveys/public-surveys.controller.js';
import { PublicSurveysService } from './services/public-surveys/public-surveys.service.js';

@Module({
  controllers: [PublicSurveysController],
  providers: [PublicSurveysService],
})
export class SurveysModule {}
