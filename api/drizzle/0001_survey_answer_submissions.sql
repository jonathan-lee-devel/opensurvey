ALTER TABLE "survey_responses" RENAME TO "survey_answer_submissions";--> statement-breakpoint
ALTER TABLE "survey_answers" RENAME COLUMN "response_id" TO "submission_id";--> statement-breakpoint
ALTER TABLE "survey_answers" DROP CONSTRAINT "survey_answers_response_id_question_id_key";--> statement-breakpoint
ALTER TABLE "survey_answers" DROP CONSTRAINT "survey_answers_response_id_survey_responses_id_fk";
--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" DROP CONSTRAINT "survey_responses_survey_id_surveys_id_fk";
--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" DROP CONSTRAINT "survey_responses_respondent_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "survey_responses_survey_id_idx";--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" ADD COLUMN "ip_address" "inet";--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" ADD COLUMN "referer" text;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_submission_id_survey_answer_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."survey_answer_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" ADD CONSTRAINT "survey_answer_submissions_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answer_submissions" ADD CONSTRAINT "survey_answer_submissions_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "survey_answer_submissions_survey_id_idx" ON "survey_answer_submissions" USING btree ("survey_id");--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_submission_id_question_id_key" UNIQUE("submission_id","question_id");