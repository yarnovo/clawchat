CREATE TYPE "public"."agent_status" AS ENUM('created', 'starting', 'running', 'stopped', 'error', 'deleted');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"image_tag" text,
	"status" "agent_status" DEFAULT 'created' NOT NULL,
	"channel_url" text,
	"container_name" text,
	"config" jsonb DEFAULT '{}'::jsonb,
	"current_session_id" integer DEFAULT 1 NOT NULL,
	"resource_profile" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "skill_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"skill_name" text NOT NULL,
	"version" text DEFAULT 'latest' NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "skill_installations" ADD CONSTRAINT "skill_installations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;