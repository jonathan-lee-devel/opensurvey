import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule, ObserveInstrument } from './app.module.js';
import { EnvService } from './config/env.schema.js';

/**
 * Turns the TRUST_PROXY string into the value Express expects: `true`/`false`
 * as booleans, a bare integer as a hop count, anything else as an address list
 * (`loopback`, `10.0.0.0/8, 172.16.0.0/12`) which Express parses itself.
 */
function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // Lets SIGTERM/SIGINT run shutdown hooks, so the database pool is closed.
  app.enableShutdownHooks();
  const config = app.get<EnvService>(ConfigService);
  // Behind a proxy every request arrives from the proxy's address; trusting it
  // makes Express read the client IP from X-Forwarded-For, which the rate
  // limiter keys on. Left unset, no proxy is trusted.
  const trustProxy = config.get('TRUST_PROXY', { infer: true });
  if (trustProxy !== undefined) {
    app.set('trust proxy', parseTrustProxy(trustProxy));
  }
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
