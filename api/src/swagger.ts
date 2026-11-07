import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Where the Swagger UI is served; the raw document sits at `${DOCS_PATH}-json` and `${DOCS_PATH}-yaml`. */
export const DOCS_PATH = 'docs';

/**
 * Mounts the OpenAPI document and Swagger UI at /docs. The document is built
 * from the controllers, the Zod schemas attached with `@Body({ schema })` and
 * friends (Zod 4.2+ converts itself, nothing to configure) and the metadata the
 * `@nestjs/swagger` CLI plugin in nest-cli.json adds at compile time. Kept out
 * of main.ts so e2e tests can mount it on an app built from AppModule.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OpenSurvey API')
    .setDescription('HTTP API for OpenSurvey polls, surveys and users.')
    .setVersion('0.0.1')
    // The JWT Bearer scheme the admin controllers reference with
    // @ApiBearerAuth(); the Authorize button in Swagger UI stores the token.
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  // A factory defers building the document until /docs is first requested.
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(DOCS_PATH, app, documentFactory, {
    customSiteTitle: 'OpenSurvey API docs',
  });
}
