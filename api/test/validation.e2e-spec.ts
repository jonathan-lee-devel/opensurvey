import {
  Body,
  Controller,
  Get,
  INestApplication,
  Param,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { z } from 'zod';

import { AppModule } from './../src/app.module.js';

const createItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive().default(1),
});
type CreateItemDto = z.infer<typeof createItemSchema>;

/**
 * A throwaway controller, so the test exercises the pipe exactly as the
 * application registers it (`APP_PIPE` in AppModule) without depending on any
 * feature module's routes.
 */
@Controller('validation-test')
class ValidationTestController {
  @Post()
  create(@Body({ schema: createItemSchema }) dto: CreateItemDto) {
    return dto;
  }

  @Get(':id')
  findOne(
    @Param('id', { schema: z.coerce.number().int().positive() }) id: number,
  ) {
    return { id, type: typeof id };
  }

  @Post('unvalidated')
  passthrough(@Body() body: unknown) {
    return body;
  }
}

describe('StandardSchemaValidationPipe (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('passes the parsed body to the handler, applying trims and defaults', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-test')
      .send({ name: '  pens  ' })
      .expect(201);
    expect(res.body).toEqual({ name: 'pens', quantity: 1 });
  });

  it('strips properties the schema does not declare', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-test')
      .send({ name: 'pens', quantity: 2, extra: true })
      .expect(201);
    expect(res.body).toEqual({ name: 'pens', quantity: 2 });
  });

  it('rejects an invalid body with 400 and one path-prefixed message per issue', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-test')
      .send({ name: '', quantity: 0 })
      .expect(400);
    expect(res.body.message).toEqual([
      expect.stringMatching(/^name: /),
      expect.stringMatching(/^quantity: /),
    ]);
  });

  it('coerces a path parameter through its schema', async () => {
    const res = await request(app.getHttpServer())
      .get('/validation-test/42')
      .expect(200);
    expect(res.body).toEqual({ id: 42, type: 'number' });
  });

  it('rejects a path parameter that fails its schema', async () => {
    await request(app.getHttpServer()).get('/validation-test/abc').expect(400);
  });

  it('leaves parameters without a schema untouched', async () => {
    const payload = { anything: ['goes', 1] };
    const res = await request(app.getHttpServer())
      .post('/validation-test/unvalidated')
      .send(payload)
      .expect(201);
    expect(res.body).toEqual(payload);
  });
});
