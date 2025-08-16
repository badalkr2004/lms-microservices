CREATE TABLE "file_upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid,
	"s3_key" varchar(500) NOT NULL,
	"presigned_url" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"s3_key" varchar(500) NOT NULL,
	"s3_url" text NOT NULL,
	"user_id" uuid NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"status" varchar(20) DEFAULT 'uploaded' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	CONSTRAINT "files_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
ALTER TABLE "file_upload_sessions" ADD CONSTRAINT "file_upload_sessions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "upload_sessions_user_id_idx" ON "file_upload_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "upload_sessions_s3_key_idx" ON "file_upload_sessions" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "upload_sessions_expires_at_idx" ON "file_upload_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "files_category_idx" ON "files" USING btree ("category");--> statement-breakpoint
CREATE INDEX "files_status_idx" ON "files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "files_s3_key_idx" ON "files" USING btree ("s3_key");--> statement-breakpoint
CREATE INDEX "files_uploaded_at_idx" ON "files" USING btree ("uploaded_at");