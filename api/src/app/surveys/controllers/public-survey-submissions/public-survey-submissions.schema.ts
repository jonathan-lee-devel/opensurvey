import { z } from 'zod';

/** The JSON for one answer: text, a rating, a chosen option or several. */
const answerValueSchema = z.union([
  z.string(),
  z.number(),
  z.array(z.string()),
]);

const answerSchema = z.strictObject({
  questionId: z.uuid(),
  value: answerValueSchema.describe(
    'Text for short_text and long_text, an integer for rating, one option label for single_choice, an array of option labels for multiple_choice',
  ),
});

export const createSubmissionSchema = z.strictObject({
  answers: z
    .array(answerSchema)
    .min(1)
    .max(50)
    .superRefine((answers, ctx) => {
      const seen = new Set<string>();
      answers.forEach((answer, index) => {
        if (seen.has(answer.questionId)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'questionId'],
            message: 'answered more than once',
          });
        }
        seen.add(answer.questionId);
      });
    })
    .describe('One answer per question; required questions must be answered'),
});

export type CreateSubmissionDto = z.infer<typeof createSubmissionSchema>;

/** What the respondent gets back: a receipt, never the metadata recorded. */
export const publicSubmissionSchema = z.object({
  id: z.uuid(),
  surveyId: z.uuid(),
  submittedAt: z.iso.datetime(),
});

export type PublicSubmission = z.infer<typeof publicSubmissionSchema>;
