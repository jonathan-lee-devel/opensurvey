import { pgEnum } from 'drizzle-orm/pg-core';

/** Lifecycle of anything that can be shared and later closed: surveys and polls. */
export const publishStatus = pgEnum('publish_status', [
  'draft',
  'published',
  'closed',
]);

export type PublishStatus = (typeof publishStatus.enumValues)[number];

export const questionType = pgEnum('question_type', [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'rating',
]);

export type QuestionType = (typeof questionType.enumValues)[number];
