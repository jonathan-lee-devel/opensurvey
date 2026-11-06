import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule, ObserveInstrument } from './app.module.js';
import { EnvService } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  // Lets SIGTERM/SIGINT run shutdown hooks, so the database pool is closed.
  app.enableShutdownHooks();
  const config = app.get<EnvService>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
