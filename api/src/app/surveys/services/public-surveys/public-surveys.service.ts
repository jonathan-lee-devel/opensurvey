import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { surveyQuestions, surveys } from '../../../../database/schema/index.js';

/** Read access to surveys for anyone with the link: only published ones. */
@Injectable()
export class PublicSurveysService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * The published survey with this slug and its questions in display order.
   * Only the columns the public response schema lists are selected.
   *
   * @throws NotFoundException when no survey has the slug or it is not published.
   */
  async findBySlug(slug: string) {
    const survey = await this.db.query.surveys.findFirst({
      columns: {
        id: true,
        title: true,
        description: true,
        slug: true,
        status: true,
      },
      where: and(eq(surveys.slug, slug), eq(surveys.status, 'published')),
      with: {
        questions: {
          columns: {
            id: true,
            type: true,
            prompt: true,
            required: true,
            position: true,
            options: true,
          },
          orderBy: asc(surveyQuestions.position),
        },
      },
    });
    if (!survey) throw new NotFoundException(`No published survey "${slug}"`);
    return survey;
  }
}
