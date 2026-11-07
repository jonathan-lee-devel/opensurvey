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

  it('documents the public routes from their Zod schemas', async () => {
    const { body } = await request(app.getHttpServer()).get(
      `/${DOCS_PATH}-json`,
    );
    expect(Object.keys(body.paths).sort()).toEqual([
      '/admin/polls',
      '/admin/surveys',
      '/admin/surveys/{id}/submissions',
      '/admin/users',
      '/public/polls/{slug}',
      '/public/surveys/{slug}',
      '/public/surveys/{slug}/submissions',
      '/public/users/{id}',
    ]);
    const get = body.paths['/public/users/{id}'].get;
    expect(get.tags).toEqual(['users']);
    expect(get.parameters[0]).toMatchObject({
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    });
    expect(
      get.responses['200'].content['application/json'].schema,
    ).toBeDefined();
    expect(get.responses['404']).toBeDefined();

    const post = body.paths['/admin/polls'].post;
    const bodySchema = post.requestBody.content['application/json'].schema;
    expect(bodySchema.required).toEqual(
      expect.arrayContaining(['ownerId', 'question', 'slug', 'options']),
    );
    expect(bodySchema.properties.options).toMatchObject({
      type: 'array',
      minItems: 2,
    });
    expect(Object.keys(post.responses).sort()).toEqual([
      '201',
      '401',
      '409',
      '422',
    ]);
  });

  it('documents the Bearer scheme on the admin routes only', async () => {
    const { body } = await request(app.getHttpServer()).get(
      `/${DOCS_PATH}-json`,
    );
    expect(body.components.securitySchemes.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(body.paths['/admin/polls'].post.security).toEqual([{ bearer: [] }]);
    expect(body.paths['/public/polls/{slug}'].get.security).toBeUndefined();
    expect(
      body.paths['/public/polls/{slug}'].get.responses['401'],
    ).toBeUndefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
