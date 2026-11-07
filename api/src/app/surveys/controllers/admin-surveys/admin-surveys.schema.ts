import { z } from 'zod';

import { slugSchema } from '../../../../common/slug.schema.js';
import {
  publishStatus,
  questionType,
} from '../../../../database/schema/index.js';

const choiceTypes: ReadonlySet<string> = new Set([
  'single_choice',
  'multiple_choice',
]);

const createQuestionSchema = z
  .strictObject({
    type: z.enum(questionType.enumValues),
    prompt: z.string().trim().min(1).max(500),
    required: z.boolean().default(false),
    options: z
      .array(z.string().trim().min(1).max(200))
      .min(2)
      .max(20)
      .optional()
      .describe(
        'Choice labels in display order; required for single_choice and multiple_choice, not allowed otherwise',
      ),
  })
  .superRefine((question, ctx) => {
    const isChoice = choiceTypes.has(question.type);
    if (isChoice && !question.options) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `required for ${question.type} questions`,
      });
    }
    if (!isChoice && question.options) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `only allowed for single_choice and multiple_choice questions`,
      });
    }
  });

export const createSurveySchema = z.strictObject({
  ownerId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000).nullable().default(null),
  slug: slugSchema,
  status: z.enum(publishStatus.enumValues).default('draft'),
  questions: z
    .array(createQuestionSchema)
    .min(1)
    .max(50)
    .describe('Questions in display order'),
});

export type CreateSurveyDto = z.infer<typeof createSurveySchema>;

/** A question as stored: the same shape in a survey and under an answer. */
export const adminQuestionSchema = z.object({
  id: z.uuid(),
  type: z.enum(questionType.enumValues),
  prompt: z.string(),
  required: z.boolean(),
  position: z.int().nonnegative(),
  options: z.array(z.string()).nullable(),
});

export type AdminQuestion = z.infer<typeof adminQuestionSchema>;

/** A survey as administrators see it, owner included. */
export const adminSurveySchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: z.enum(publishStatus.enumValues),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  questions: z.array(adminQuestionSchema),
});

export type AdminSurvey = z.infer<typeof adminSurveySchema>;

export const surveyIdSchema = z.uuid().describe('The survey id');

/** Paging for the submissions list: newest first. */
export const listSubmissionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

/**
 * A submission as administrators see it: request metadata and answers, each
 * answer carrying the question it answers so the list reads without a second
 * lookup.
 */
export const adminSubmissionSchema = z.object({
  id: z.uuid(),
  surveyId: z.uuid(),
  respondentId: z.uuid().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  referer: z.string().nullable(),
  submittedAt: z.iso.datetime(),
  answers: z.array(
    z.object({
      id: z.uuid(),
      question: adminQuestionSchema,
      value: z.union([z.string(), z.number(), z.array(z.string())]),
    }),
  ),
});

export const adminSubmissionListSchema = z.object({
  items: z.array(adminSubmissionSchema),
  /** Submissions for the survey in total, whatever the paging. */
  total: z.int().nonnegative(),
});

export type AdminSubmissionList = z.infer<typeof adminSubmissionListSchema>;
