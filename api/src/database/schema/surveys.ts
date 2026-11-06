import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { publishStatus, questionType } from './enums.js';
import { users } from './users.js';

export const surveys = pgTable(
  'surveys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    // Short identifier used in the public link to the survey.
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    status: publishStatus('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('surveys_owner_id_idx').on(t.ownerId)],
);

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;

export const surveyQuestions = pgTable(
  'survey_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    type: questionType('type').notNull(),
    prompt: text('prompt').notNull(),
    required: boolean('required').notNull().default(false),
    // Zero-based order of the question within its survey.
    position: integer('position').notNull(),
    // Choice labels for single_choice and multiple_choice questions.
    options: jsonb('options').$type<string[]>(),
  },
  (t) => [
    unique('survey_questions_survey_id_position_key').on(
      t.surveyId,
      t.position,
    ),
  ],
);

export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type NewSurveyQuestion = typeof surveyQuestions.$inferInsert;

export const surveyResponses = pgTable(
  'survey_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    surveyId: uuid('survey_id')
      .notNull()
      .references(() => surveys.id, { onDelete: 'cascade' }),
    // Null for anonymous responses, and after the respondent is deleted.
    respondentId: uuid('respondent_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('survey_responses_survey_id_idx').on(t.surveyId)],
);

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type NewSurveyResponse = typeof surveyResponses.$inferInsert;

/** The JSON stored for one answer, depending on the question type. */
export type SurveyAnswerValue = string | number | string[];

export const surveyAnswers = pgTable(
  'survey_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    responseId: uuid('response_id')
      .notNull()
      .references(() => surveyResponses.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => surveyQuestions.id, { onDelete: 'cascade' }),
    value: jsonb('value').$type<SurveyAnswerValue>().notNull(),
  },
  (t) => [
    unique('survey_answers_response_id_question_id_key').on(
      t.responseId,
      t.questionId,
    ),
  ],
);

export type SurveyAnswer = typeof surveyAnswers.$inferSelect;
export type NewSurveyAnswer = typeof surveyAnswers.$inferInsert;
