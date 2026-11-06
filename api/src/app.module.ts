import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';

import { PollsModule } from './app/polls/polls.module.js';
import { SurveysModule } from './app/surveys/surveys.module.js';
import { UsersModule } from './app/users/users.module.js';
import { envSchema, EnvService } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Loads `.env` from the working directory, merges it with the process
    // environment (which wins) and validates the result against envSchema.
    // Global, so any module can inject ConfigService without importing this
    // module; never read `process.env` directly.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
      // Tests get everything they need from test/global-setup.ts; a developer's
      // `.env` (Observe keys included) must not leak into them.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    // With no key pair configured, Observe logs a warning and sends nothing.
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: EnvService) => ({
        appKey: config.get('OBSERVE_APP_KEY', { infer: true }),
        appSecret: config.get('OBSERVE_APP_SECRET', { infer: true }),
        serviceId: 'api',
      }),
    }),
    DatabaseModule,
    SurveysModule,
    PollsModule,
    UsersModule,
  ],
})
export class AppModule {}
