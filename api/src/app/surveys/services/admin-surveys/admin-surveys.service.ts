import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { count, desc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../../../database/pg-errors.js';
import {
  surveyAnswerSubmissions,
  surveyQuestions,
  surveys,
} from '../../../../database/schema/index.js';
import type {
  CreateSurveyDto,
  ListSubmissionsQuery,
} from '../../controllers/admin-surveys/admin-surveys.schema.js';

@Injectable()
export class AdminSurveysService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

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
