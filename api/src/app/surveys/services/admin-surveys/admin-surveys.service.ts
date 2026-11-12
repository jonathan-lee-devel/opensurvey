import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { asc, count, desc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { isForeignKeyViolation, isUniqueViolation, } from '../../../../database/pg-errors.js';
import { surveyAnswerSubmissions, surveyQuestions, surveys, } from '../../../../database/schema/index.js';
import type {
  CreateSurveyDto,
  ListSubmissionsQuery,
  ListSurveysQuery,
  UpdateSurveyDto,
} from '../../controllers/admin-surveys/admin-surveys.schema.js';

/** The cached public response for a slug, as `CacheInterceptor` keys it. */
const publicSurveyUrl = (slug: string) => `/public/surveys/${slug}`;

@Injectable()
export class AdminSurveysService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Creates a survey and its questions in one transaction. Questions take
   * their position from their order in the request.
   *
   * @throws ConflictException when a survey with the slug already exists.
   * @throws UnprocessableEntityException when the owner does not exist.
   */
  async create(dto: CreateSurveyDto) {
    try {
      return await this.db.transaction(async (tx) => {
        const [survey] = await tx
          .insert(surveys)
          .values({
            ownerId: dto.ownerId,
            title: dto.title,
            description: dto.description,
            slug: dto.slug,
            status: dto.status,
          })
          .returning();
        const questions = await tx
          .insert(surveyQuestions)
          .values(
            dto.questions.map((question, position) => ({
              surveyId: survey.id,
              type: question.type,
              prompt: question.prompt,
              required: question.required,
              position,
              options: question.options ?? null,
            })),
          )
          .returning({
            id: surveyQuestions.id,
            type: surveyQuestions.type,
            prompt: surveyQuestions.prompt,
            required: surveyQuestions.required,
            position: surveyQuestions.position,
            options: surveyQuestions.options,
          });
        questions.sort((a, b) => a.position - b.position);
        return { ...survey, questions };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A survey with slug "${dto.slug}" exists`);
      }
      if (isForeignKeyViolation(error)) {
        throw new UnprocessableEntityException(
          `No user "${dto.ownerId}" to own the survey`,
        );
      }
      throw error;
    }
  }

  /**
   * A page of surveys, newest first, without their questions, plus the total
   * for the paging controls. Every status is listed unless one is asked for.
   */
  async list({ limit, offset, status }: ListSurveysQuery) {
    const where = status ? eq(surveys.status, status) : undefined;
    const [items, [{ total }]] = await Promise.all([
      this.db.query.surveys.findMany({
        where,
        orderBy: desc(surveys.createdAt),
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(surveys).where(where),
    ]);
    return { items, total };
  }

  /**
   * The survey with this id and its questions in display order, whatever its
   * status: administrators see drafts and closed surveys too.
   *
   * @throws NotFoundException when no survey has the id.
   */
  async findById(id: string) {
    const survey = await this.db.query.surveys.findFirst({
      where: eq(surveys.id, id),
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
    if (!survey) throw new NotFoundException(`No survey "${id}"`);
    return survey;
  }

  /**
   * Changes the survey's own fields and returns it as `findById()` does. The
   * public response cached under the old slug (and the new one, if renamed)
   * is dropped, so a closed or renamed survey disappears from its link at
   * once and a published one appears.
   *
   * @throws NotFoundException when no survey has the id.
   * @throws ConflictException when another survey has the new slug.
   */
  async update(id: string, dto: UpdateSurveyDto) {
    const existing = await this.db.query.surveys.findFirst({
      columns: { id: true, slug: true },
      where: eq(surveys.id, id),
    });
    if (!existing) throw new NotFoundException(`No survey "${id}"`);

    let updated: { slug: string };
    try {
      [updated] = await this.db
        .update(surveys)
        .set(dto)
        .where(eq(surveys.id, id))
        .returning({ slug: surveys.slug });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A survey with slug "${dto.slug}" exists`);
      }
      throw error;
    }
    await this.invalidatePublic(existing.slug, updated.slug);
    return this.findById(id);
  }

  /**
   * Deletes the survey; its questions, submissions and answers cascade, and
   * the public response cached under its slug is dropped.
   *
   * @throws NotFoundException when no survey has the id.
   */
  async remove(id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(surveys)
      .where(eq(surveys.id, id))
      .returning({ slug: surveys.slug });
    if (!deleted) throw new NotFoundException(`No survey "${id}"`);
    await this.invalidatePublic(deleted.slug);
  }

  private async invalidatePublic(...slugs: string[]): Promise<void> {
    const urls = [...new Set(slugs)].map(publicSurveyUrl);
    await Promise.all(urls.map((url) => this.cache.del(url)));
  }

  /**
   * A page of the survey's submissions, newest first, each with its request
   * metadata and answers, plus the total for the paging controls. Every
   * answer carries its question, in the survey's question order.
   *
   * @throws NotFoundException when no survey has the id, whatever its status.
   */
  async listSubmissions(
    surveyId: string,
    { limit, offset }: ListSubmissionsQuery,
  ) {
    const survey = await this.db.query.surveys.findFirst({
      columns: { id: true },
      where: eq(surveys.id, surveyId),
    });
    if (!survey) throw new NotFoundException(`No survey "${surveyId}"`);

    const bySurvey = eq(surveyAnswerSubmissions.surveyId, surveyId);
    const [items, [{ total }]] = await Promise.all([
      this.db.query.surveyAnswerSubmissions.findMany({
        where: bySurvey,
        orderBy: desc(surveyAnswerSubmissions.submittedAt),
        limit,
        offset,
        with: {
          answers: {
            columns: { id: true, value: true },
            with: {
              question: {
                columns: {
                  id: true,
                  type: true,
                  prompt: true,
                  required: true,
                  position: true,
                  options: true,
                },
              },
            },
          },
        },
      }),
      this.db
        .select({ total: count() })
        .from(surveyAnswerSubmissions)
        .where(bySurvey),
    ]);
    // Answers in the survey's question order, as a reader expects them.
    for (const item of items) {
      item.answers.sort((a, b) => a.question.position - b.question.position);
    }
    return { items, total };
  }
}
