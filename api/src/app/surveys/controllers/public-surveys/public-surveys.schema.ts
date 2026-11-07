import { z } from 'zod';

import {
  publishStatus,
  questionType,
} from '../../../../database/schema/index.js';

export const surveySlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .describe('Short identifier from the public link to the survey');

/** What anyone with the link may see about a published survey. */
export const publicSurveySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  status: z.enum(publishStatus.enumValues),
  questions: z.array(
    z.object({
      id: z.uuid(),
      type: z.enum(questionType.enumValues),
      prompt: z.string(),
      required: z.boolean(),
      position: z.int().nonnegative(),
      options: z
        .array(z.string())
        .nullable()
        .describe('Choice labels for single_choice and multiple_choice'),
    }),
  ),
});

export type PublicSurvey = z.infer<typeof publicSurveySchema>;
