CREATE TYPE "public"."auth_method" AS ENUM('email', 'google', 'apple', 'phone');--> statement-breakpoint
CREATE TYPE "public"."course_difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('draft', 'published', 'archived', 'under_review');--> statement-breakpoint
CREATE TYPE "public"."download_status" AS ENUM('pending', 'downloading', 'completed', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."download_type" AS ENUM('video', 'pdf', 'audio', 'document');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'dropped', 'expired');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('course_update', 'payment', 'achievement', 'reminder', 'announcement', 'live_session', 'test_result', 'violation');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('razorpay', 'stripe', 'paypal', 'wallet', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pricing_type" AS ENUM('free', 'paid', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('mcq', 'multiple_select', 'true_false', 'short_answer', 'long_answer', 'fill_blank');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'live', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('quiz', 'assignment', 'final_exam', 'practice');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."violation_type" AS ENUM('phone_detected', 'multiple_faces', 'no_face', 'looking_away', 'audio_detected', 'tab_switch', 'copy_paste', 'other');--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"option_text" text NOT NULL,
	"option_image_url" varchar(500),
	"is_correct" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "question_options_question_id_sort_order_unique" UNIQUE("question_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "test_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"question_text" text NOT NULL,
	"question_image_url" varchar(500),
	"marks" integer DEFAULT 1 NOT NULL,
	"explanation" text,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "test_questions_test_id_sort_order_unique" UNIQUE("test_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"chapter_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"test_type" "test_type" DEFAULT 'quiz',
	"duration_minutes" integer NOT NULL,
	"total_marks" integer DEFAULT 0 NOT NULL,
	"passing_marks" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 1 NOT NULL,
	"shuffle_questions" boolean DEFAULT false NOT NULL,
	"shuffle_options" boolean DEFAULT false NOT NULL,
	"show_results" boolean DEFAULT true NOT NULL,
	"show_correct_answers" boolean DEFAULT true NOT NULL,
	"proctoring_enabled" boolean DEFAULT false NOT NULL,
	"proctoring_strictness" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"icon_url" varchar(500),
	"color_code" varchar(7),
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_chapters_course_id_sort_order_unique" UNIQUE("course_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "course_lectures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"chapter_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content_type" varchar(50) NOT NULL,
	"video_url" varchar(500),
	"video_duration" integer,
	"video_mux_asset_id" varchar(255),
	"pdf_url" varchar(500),
	"text_content" text,
	"is_preview" boolean DEFAULT false NOT NULL,
	"is_downloadable" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_lectures_course_id_chapter_id_sort_order_unique" UNIQUE("course_id","chapter_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"category_id" uuid,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"short_description" text,
	"thumbnail_url" varchar(500),
	"trailer_video_url" varchar(500),
	"difficulty" "course_difficulty" DEFAULT 'beginner',
	"status" "course_status" DEFAULT 'draft',
	"pricing_type" "pricing_type" DEFAULT 'free',
	"price" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"discount_price" numeric(10, 2),
	"duration_hours" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"language" varchar(50) DEFAULT 'en',
	"prerequisites" text,
	"what_you_learn" text[],
	"target_audience" text[],
	"requirements" text[],
	"tags" text[],
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_bestseller" boolean DEFAULT false NOT NULL,
	"max_students" integer,
	"certificate_available" boolean DEFAULT false NOT NULL,
	"certificate_template_url" varchar(500),
	"total_enrollments" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0.00' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"total_lectures" integer DEFAULT 0 NOT NULL,
	"total_quizzes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"published_at" timestamp,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug"),
	CONSTRAINT "positive_price" CHECK ("courses"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'active',
	"enrolled_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"last_accessed_at" timestamp,
	"certificate_issued" boolean DEFAULT false NOT NULL,
	"certificate_url" varchar(500),
	"total_watch_time" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "course_enrollments_user_id_course_id_unique" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "user_lecture_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"lecture_id" uuid NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"watch_time" integer DEFAULT 0 NOT NULL,
	"last_position" integer DEFAULT 0 NOT NULL,
	"first_watched_at" timestamp,
	"completed_at" timestamp,
	"last_accessed_at" timestamp DEFAULT now(),
	CONSTRAINT "user_lecture_progress_user_id_lecture_id_unique" UNIQUE("user_id","lecture_id")
);
--> statement-breakpoint
CREATE TABLE "live_session_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp,
	"attendance_duration" integer DEFAULT 0 NOT NULL,
	"is_present" boolean DEFAULT false NOT NULL,
	CONSTRAINT "live_session_participants_session_id_user_id_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"session_url" varchar(500),
	"meeting_id" varchar(255),
	"meeting_password" varchar(100),
	"scheduled_at" timestamp NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_minutes" integer,
	"status" "session_status" DEFAULT 'scheduled',
	"max_participants" integer DEFAULT 100 NOT NULL,
	"is_recorded" boolean DEFAULT false NOT NULL,
	"recording_url" varchar(500),
	"agenda" text,
	"materials_url" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid,
	"subscription_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"status" "payment_status" DEFAULT 'pending',
	"payment_method" "payment_method" NOT NULL,
	"payment_gateway_id" varchar(255),
	"payment_gateway_response" jsonb,
	"transaction_id" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration_months" integer NOT NULL,
	"features" text[],
	"max_courses" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teacher_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"ifsc_code" varchar(20) NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"branch_name" varchar(255),
	"account_type" varchar(50) DEFAULT 'savings',
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teacher_bank_accounts_teacher_id_account_number_unique" UNIQUE("teacher_id","account_number")
);
--> statement-breakpoint
CREATE TABLE "teacher_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"gross_amount" numeric(10, 2) NOT NULL,
	"platform_fee" numeric(10, 2) NOT NULL,
	"tax_deduction" numeric(10, 2) DEFAULT '0.00',
	"net_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"earned_at" timestamp DEFAULT now(),
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"payout_id" uuid
);
--> statement-breakpoint
CREATE TABLE "teacher_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"bank_account_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"status" "payment_status" DEFAULT 'pending',
	"transaction_id" varchar(255),
	"gateway_response" jsonb,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"payment_method" "payment_method",
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "proctoring_violations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"violation_type" "violation_type" NOT NULL,
	"description" text,
	"severity" integer DEFAULT 1 NOT NULL,
	"screenshot_url" varchar(500),
	"video_clip_url" varchar(500),
	"detected_at" timestamp DEFAULT now(),
	"confidence_score" numeric(5, 2),
	"action_taken" varchar(100),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "test_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_options" uuid[],
	"text_answer" text,
	"is_correct" boolean,
	"marks_obtained" integer DEFAULT 0 NOT NULL,
	"answered_at" timestamp DEFAULT now(),
	"time_taken" integer,
	CONSTRAINT "test_answers_session_id_question_id_unique" UNIQUE("session_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"submitted_at" timestamp,
	"duration_taken" integer,
	"is_completed" boolean DEFAULT false NOT NULL,
	"is_terminated" boolean DEFAULT false NOT NULL,
	"termination_reason" text,
	"ip_address" "inet",
	"user_agent" text,
	"proctoring_data" jsonb,
	"violation_count" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"percentage_score" numeric(5, 2) DEFAULT '0.00',
	CONSTRAINT "test_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "course_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "course_reviews_user_id_course_id_unique" UNIQUE("user_id","course_id"),
	CONSTRAINT "course_reviews_rating_check" CHECK ("course_reviews"."rating" >= 1 AND "course_reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "teacher_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teacher_reviews_user_id_teacher_id_unique" UNIQUE("user_id","teacher_id"),
	CONSTRAINT "teacher_reviews_rating_check" CHECK ("teacher_reviews"."rating" >= 1 AND "teacher_reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "user_auth_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_method" "auth_method" NOT NULL,
	"provider_id" varchar(255),
	"provider_data" jsonb,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_auth_methods_user_id_auth_method_unique" UNIQUE("user_id","auth_method")
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"interest_name" varchar(100),
	"priority" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_interests_user_id_category_id_unique" UNIQUE("user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"display_name" varchar(150),
	"bio" text,
	"avatar_url" varchar(500),
	"date_of_birth" date,
	"gender" varchar(20),
	"country" varchar(100),
	"state" varchar(100),
	"city" varchar(100),
	"timezone" varchar(50),
	"preferred_language" varchar(10) DEFAULT 'en',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password_hash" varchar(255),
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_login" timestamp,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "valid_email" CHECK ("users"."email" ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);
--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_questions" ADD CONSTRAINT "test_questions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_chapter_id_course_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_chapters" ADD CONSTRAINT "course_chapters_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lectures" ADD CONSTRAINT "course_lectures_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lectures" ADD CONSTRAINT "course_lectures_chapter_id_course_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."course_chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lecture_progress" ADD CONSTRAINT "user_lecture_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lecture_progress" ADD CONSTRAINT "user_lecture_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_lecture_progress" ADD CONSTRAINT "user_lecture_progress_lecture_id_course_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."course_lectures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_session_participants" ADD CONSTRAINT "live_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_bank_accounts" ADD CONSTRAINT "teacher_bank_accounts_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_earnings" ADD CONSTRAINT "teacher_earnings_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_payouts" ADD CONSTRAINT "teacher_payouts_bank_account_id_teacher_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."teacher_bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proctoring_violations" ADD CONSTRAINT "proctoring_violations_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_question_id_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_reviews" ADD CONSTRAINT "course_reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_reviews" ADD CONSTRAINT "teacher_reviews_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_auth_methods" ADD CONSTRAINT "user_auth_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_question_options_question" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_test_questions_test" ON "test_questions" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "idx_tests_course" ON "tests" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_chapters_course" ON "course_chapters" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_lectures_course" ON "course_lectures" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_lectures_chapter" ON "course_lectures" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_courses_teacher" ON "courses" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_courses_category" ON "courses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_courses_status" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_courses_featured" ON "courses" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "idx_courses_teacher_status" ON "courses" USING btree ("teacher_id","status");--> statement-breakpoint
CREATE INDEX "idx_courses_category_featured" ON "courses" USING btree ("category_id","is_featured");--> statement-breakpoint
CREATE INDEX "idx_courses_published" ON "courses" USING btree ("status") WHERE "courses"."status" = 'published'::course_status;--> statement-breakpoint
CREATE INDEX "idx_enrollments_user" ON "course_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_course" ON "course_enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_active" ON "course_enrollments" USING btree ("status") WHERE "course_enrollments"."status" = 'active'::enrollment_status;--> statement-breakpoint
CREATE INDEX "idx_enrollments_user_status" ON "course_enrollments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_lecture_progress_user" ON "user_lecture_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_lecture_progress_course" ON "user_lecture_progress" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_lecture_progress_lecture" ON "user_lecture_progress" USING btree ("lecture_id");--> statement-breakpoint
CREATE INDEX "idx_session_participants_session" ON "live_session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_session_participants_user" ON "live_session_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_course" ON "live_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_teacher" ON "live_sessions" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_scheduled" ON "live_sessions" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_live_sessions_course_status" ON "live_sessions" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payments_course" ON "payments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_payments_subscription" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway" ON "payments" USING btree ("payment_gateway_id");--> statement-breakpoint
CREATE INDEX "idx_payments_completed" ON "payments" USING btree ("status") WHERE "payments"."status" = 'completed'::payment_status;--> statement-breakpoint
CREATE INDEX "idx_payments_user_status" ON "payments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_earnings_teacher" ON "teacher_earnings" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_earnings_course" ON "teacher_earnings" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_earnings_payment" ON "teacher_earnings" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_teacher" ON "teacher_payouts" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_bank_account" ON "teacher_payouts" USING btree ("bank_account_id");--> statement-breakpoint
CREATE INDEX "idx_payouts_status" ON "teacher_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_plan" ON "user_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_active" ON "user_subscriptions" USING btree ("is_active","expires_at");--> statement-breakpoint
CREATE INDEX "idx_violations_session" ON "proctoring_violations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_violations_type" ON "proctoring_violations" USING btree ("violation_type");--> statement-breakpoint
CREATE INDEX "idx_test_answers_session" ON "test_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_test_answers_question" ON "test_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "test_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_test" ON "test_sessions" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "idx_test_sessions_user_completed" ON "test_sessions" USING btree ("user_id","is_completed");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_course" ON "course_reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_user" ON "course_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_course_reviews_rating" ON "course_reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_teacher_reviews_teacher" ON "teacher_reviews" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_teacher_reviews_user" ON "teacher_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_profiles_user_id" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_email_verified" ON "users" USING btree ("email") WHERE "users"."email_verified" = true;