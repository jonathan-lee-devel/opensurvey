import { relations } from 'drizzle-orm';

import { pollOptions, polls, pollVotes } from './polls.js';
import {
  surveyAnswers,
  surveyAnswerSubmissions,
  surveyQuestions,
  surveys,
} from './surveys.js';
import { users } from './users.js';

export const usersRelations = relations(users, ({ many }) => ({
  surveys: many(surveys),
  polls: many(polls),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  owner: one(users, { fields: [surveys.ownerId], references: [users.id] }),
  questions: many(surveyQuestions),
  submissions: many(surveyAnswerSubmissions),
}));

export const surveyQuestionsRelations = relations(
  surveyQuestions,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyQuestions.surveyId],
      references: [surveys.id],
    }),
    answers: many(surveyAnswers),
  }),
);

export const surveyAnswerSubmissionsRelations = relations(
  surveyAnswerSubmissions,
  ({ one, many }) => ({
    survey: one(surveys, {
      fields: [surveyAnswerSubmissions.surveyId],
      references: [surveys.id],
    }),
    respondent: one(users, {
      fields: [surveyAnswerSubmissions.respondentId],
      references: [users.id],
    }),
    answers: many(surveyAnswers),
  }),
);

export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  submission: one(surveyAnswerSubmissions, {
    fields: [surveyAnswers.submissionId],
    references: [surveyAnswerSubmissions.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

export const pollsRelations = relations(polls, ({ one, many }) => ({
  owner: one(users, { fields: [polls.ownerId], references: [users.id] }),
  options: many(pollOptions),
  votes: many(pollVotes),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
  votes: many(pollVotes),
}));

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, { fields: [pollVotes.pollId], references: [polls.id] }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  voter: one(users, { fields: [pollVotes.voterId], references: [users.id] }),
}));
