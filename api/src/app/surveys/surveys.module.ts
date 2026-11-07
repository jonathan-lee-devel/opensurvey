import { Module } from '@nestjs/common';

import { PublicSurveysController } from './controllers/public-surveys/public-surveys.controller.js';

@Module({
  controllers: [PublicSurveysController],
})
export class SurveysModule {}
