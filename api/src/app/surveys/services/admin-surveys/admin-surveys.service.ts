import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../../../database/pg-errors.js';
import { surveyQuestions, surveys } from '../../../../database/schema/index.js';
import type { CreateSurveyDto } from '../../controllers/admin-surveys/admin-surveys.schema.js';

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
}
