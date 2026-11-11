/**
 * Shapes of the API's requests and responses, mirroring the Zod schemas in
 * `api/src/app/<feature>/controllers/admin-<name>/admin-<name>.schema.ts`. Keep the names and
 * fields identical to the API's inferred types so a change on one side is easy
 * to spot on the other.
 */

/** Lifecycle of anything that can be shared and later closed: surveys and polls. */
export const PUBLISH_STATUSES = ['draft', 'published', 'closed'] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'rating',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Question types that carry `options`; the others must not. */
export const CHOICE_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  'single_choice',
  'multiple_choice',
]);

export function isChoiceType(type: QuestionType): boolean {
  return CHOICE_QUESTION_TYPES.has(type);
}

/** Paging shared by the admin lists: newest first. */
export interface PageQuery {
  /** 1 to 200; the API defaults to 50. */
  readonly limit?: number;
  /** 0 or more; the API defaults to 0. */
  readonly offset?: number;
}

export interface ListSurveysQuery extends PageQuery {
  /** Only surveys with this status. */
  readonly status?: PublishStatus;
}

export type ListSubmissionsQuery = PageQuery;

export type ListUsersQuery = PageQuery;

export interface ListPollsQuery extends PageQuery {
  /** Only polls with this status. */
  readonly status?: PublishStatus;
}

/** A page of items with the total matching the filter, whatever the paging. */
export interface PagedList<T> {
  readonly items: readonly T[];
  readonly total: number;
}

// --- Surveys -------------------------------------------------------------

export interface CreateQuestionDto {
  readonly type: QuestionType;
  /** 1 to 500 characters. */
  readonly prompt: string;
  readonly required: boolean;
  /** 2 to 20 labels of 1 to 200 characters; only for choice types. */
  readonly options?: readonly string[];
}

export interface CreateSurveyDto {
  readonly ownerId: string;
  /** 1 to 200 characters. */
  readonly title: string;
  /** 1 to 2000 characters, or null. */
  readonly description: string | null;
  /** Lowercase letters and digits separated by single hyphens, up to 64 characters. */
  readonly slug: string;
  readonly status: PublishStatus;
  /** 1 to 50 questions in display order. */
  readonly questions: readonly CreateQuestionDto[];
}

/**
 * What an administrator may change after creation: any subset of the
 * survey's own fields, at least one. Questions are fixed once answers can
 * refer to them.
 */
export interface UpdateSurveyDto {
  readonly title?: string;
  readonly description?: string | null;
  readonly slug?: string;
  readonly status?: PublishStatus;
}

/** A question as stored: the same shape in a survey and under an answer. */
export interface AdminQuestion {
  readonly id: string;
  readonly type: QuestionType;
  readonly prompt: string;
  readonly required: boolean;
  readonly position: number;
  readonly options: readonly string[] | null;
}

/** A survey in the list: everything but its questions. */
export interface AdminSurveySummary {
  readonly id: string;
  readonly ownerId: string;
  readonly title: string;
  readonly description: string | null;
  readonly slug: string;
  readonly status: PublishStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A survey as administrators see it, owner included. */
export interface AdminSurvey extends AdminSurveySummary {
  readonly questions: readonly AdminQuestion[];
}

export type AdminSurveyList = PagedList<AdminSurveySummary>;

/** A string for text questions, a number for ratings, labels for multiple choice. */
export type AnswerValue = string | number | readonly string[];

export interface AdminAnswer {
  readonly id: string;
  readonly question: AdminQuestion;
  readonly value: AnswerValue;
}

/** A submission with the request metadata it was recorded with and its answers. */
export interface AdminSubmission {
  readonly id: string;
  readonly surveyId: string;
  readonly respondentId: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly referer: string | null;
  readonly submittedAt: string;
  readonly answers: readonly AdminAnswer[];
}

export type AdminSubmissionList = PagedList<AdminSubmission>;

// --- Polls ---------------------------------------------------------------

export interface CreatePollDto {
  readonly ownerId: string;
  /** 1 to 500 characters. */
  readonly question: string;
  readonly slug: string;
  readonly status: PublishStatus;
  /** ISO 8601 date-time with offset, or null to stay open. */
  readonly closesAt: string | null;
  /** 2 to 20 labels of 1 to 200 characters in display order. */
  readonly options: readonly string[];
}

/** Any subset of a poll's own fields, at least one; options are fixed once votes can refer to them. */
export interface UpdatePollDto {
  readonly question?: string;
  readonly slug?: string;
  readonly status?: PublishStatus;
  /** ISO 8601 date-time with offset, or null to stay open. */
  readonly closesAt?: string | null;
}

export interface AdminPollOption {
  readonly id: string;
  readonly label: string;
  readonly position: number;
}

/** A poll in the list: everything but its options. */
export interface AdminPollSummary {
  readonly id: string;
  readonly ownerId: string;
  readonly question: string;
  readonly slug: string;
  readonly status: PublishStatus;
  readonly closesAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A poll as administrators see it, owner included. */
export interface AdminPoll extends AdminPollSummary {
  readonly options: readonly AdminPollOption[];
}

export type AdminPollList = PagedList<AdminPollSummary>;

// --- Users ---------------------------------------------------------------

export interface CreateUserDto {
  /** Up to 320 characters; stored lowercased. */
  readonly email: string;
  /** 1 to 120 characters. */
  readonly displayName?: string;
}

/** A user as administrators see it, email included. */
export interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AdminUserList = PagedList<AdminUser>;

// --- Public ---------------------------------------------------------------

/** What anyone with the link may see about a published survey. */
export interface PublicSurvey {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly slug: string;
  readonly status: PublishStatus;
  readonly questions: readonly AdminQuestion[];
}

export interface SubmissionAnswerDto {
  readonly questionId: string;
  /** Text, an integer rating, one option label, or several labels. */
  readonly value: AnswerValue;
}

/** One answer per question; required questions must be answered; 1 to 50 answers. */
export interface CreateSubmissionDto {
  readonly answers: readonly SubmissionAnswerDto[];
}

/** What the respondent gets back: a receipt, never the metadata recorded. */
export interface PublicSubmission {
  readonly id: string;
  readonly surveyId: string;
  readonly submittedAt: string;
}
