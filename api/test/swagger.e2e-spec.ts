import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { DOCS_PATH, setupSwagger } from './../src/swagger.js';

// main.ts mounts the docs the same way, so this covers what a developer gets
// at http://localhost:3000/docs without starting the real server.
describe('Swagger (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  it(`serves the Swagger UI at /${DOCS_PATH}`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${DOCS_PATH}`)
      .expect(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger-ui');
  });

  it(`serves the OpenAPI document at /${DOCS_PATH}-json`, async () => {
    const response = await request(app.getHttpServer())
      .get(`/${DOCS_PATH}-json`)
      .expect(200);
    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.info.title).toBe('OpenSurvey API');
  });

  afterAll(async () => {
    await app.close();
  });
});
