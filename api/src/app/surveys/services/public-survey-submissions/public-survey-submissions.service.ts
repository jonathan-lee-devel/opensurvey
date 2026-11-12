import { Injectable, NotFoundException, UnprocessableEntityException, } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { ClientMetadata } from '../../../../common/client-metadata.decorator.js';
import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { isForeignKeyViolation } from '../../../../database/pg-errors.js';
import type { QuestionType, SurveyAnswerValue, } from '../../../../database/schema/index.js';
import {
  RATING_MAX,
  RATING_MIN,
  surveyAnswers,
  surveyAnswerSubmissions,
  surveys,
} from '../../../../database/schema/index.js';
import type {
  CreateSubmissionDto
} from '../../controllers/public-survey-submissions/public-survey-submissions.schema.js';

/** What the validation needs to know about a question. */
interface AnswerableQuestion {
  id: string;
  type: QuestionType;
  required: boolean;
  options: string[] | null;
}

const SHORT_TEXT_MAX = 500;
const LONG_TEXT_MAX = 5000;

/** Anyone with the link may answer a published survey, once per attempt. */
@Injectable()
export class PublicSurveySubmissionsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Records one submission of answers to the published survey with this slug,
   * with the request metadata, in one transaction: the submission row, then
   * its answers.
   *
   * @throws NotFoundException when no survey has the slug or it is not published.
   * @throws UnprocessableEntityException when an answer does not fit its
   *   question, a question is not part of the survey, or a required question
   *   is unanswered; the message lists every problem.
   */
  async create(slug: string, dto: CreateSubmissionDto, client: ClientMetadata) {
    const survey = await this.db.query.surveys.findFirst({
      columns: { id: true },
      where: and(eq(surveys.slug, slug), eq(surveys.status, 'published')),
      with: {
        questions: {
          columns: { id: true, type: true, required: true, options: true },
        },
      },
    });
    if (!survey) throw new NotFoundException(`No published survey "${slug}"`);

    const problems = this.validate(survey.questions, dto.answers);
    if (problems.length > 0) {
      throw new UnprocessableEntityException(problems);
    }

    try {
      return await this.db.transaction(async (tx) => {
        const [submission] = await tx
          .insert(surveyAnswerSubmissions)
          .values({
            surveyId: survey.id,
            ipAddress: client.ipAddress,
            userAgent: client.userAgent,
            referer: client.referer,
          })
          .returning({
            id: surveyAnswerSubmissions.id,
            surveyId: surveyAnswerSubmissions.surveyId,
            submittedAt: surveyAnswerSubmissions.submittedAt,
          });
        await tx.insert(surveyAnswers).values(
          dto.answers.map((answer) => ({
            submissionId: submission.id,
            questionId: answer.questionId,
            value: answer.value,
          })),
        );
        return submission;
      });
    } catch (error) {
      // A question deleted between the read above and this write.
      if (isForeignKeyViolation(error)) {
        throw new UnprocessableEntityException(
          'A question of this survey no longer exists',
        );
      }
      throw error;
    }
  }

  /**
   * Checks the answers against the survey's questions. Messages follow the
   * validation pipe's `path: problem` shape, one per problem.
   */
  private validate(
    questions: AnswerableQuestion[],
    answers: CreateSubmissionDto['answers'],
  ): string[] {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const answered = new Set<string>();
    const problems: string[] = [];
    answers.forEach((answer, index) => {
      const question = byId.get(answer.questionId);
      if (!question) {
        problems.push(
          `answers.${index}.questionId: not a question of this survey`,
        );
        return;
      }
      answered.add(question.id);
      const problem = this.valueProblem(question, answer.value);
      if (problem) problems.push(`answers.${index}.value: ${problem}`);
    });
    for (const question of questions) {
      if (question.required && !answered.has(question.id)) {
        problems.push(`answers: required question "${question.id}" is missing`);
      }
    }
    return problems;
  }

  /** Why the value does not fit the question's type, or undefined if it does. */
  private valueProblem(
    question: AnswerableQuestion,
    value: SurveyAnswerValue,
  ): string | undefined {
    const options = question.options ?? [];
    switch (question.type) {
      case 'short_text':
        return isText(value, SHORT_TEXT_MAX)
          ? undefined
          : `must be text of 1 to ${SHORT_TEXT_MAX} characters`;
      case 'long_text':
        return isText(value, LONG_TEXT_MAX)
          ? undefined
          : `must be text of 1 to ${LONG_TEXT_MAX} characters`;
      case 'rating':
        return typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= RATING_MIN &&
          value <= RATING_MAX
          ? undefined
          : `must be an integer from ${RATING_MIN} to ${RATING_MAX}`;
      case 'single_choice':
        return typeof value === 'string' && options.includes(value)
          ? undefined
          : `must be one of the question's options`;
      case 'multiple_choice':
        return Array.isArray(value) &&
          value.length > 0 &&
          new Set(value).size === value.length &&
          value.every((label) => options.includes(label))
          ? undefined
          : `must be one or more distinct options of the question`;
    }
  }
}

const isText = (value: SurveyAnswerValue, max: number): boolean =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
