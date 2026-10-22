CREATE SCHEMA "bot_adapter";
--> statement-breakpoint
CREATE TABLE "bot_adapter"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"userId" uuid NOT NULL,
	"channelConversationId" text NOT NULL,
	"channelId" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"lastMessageAt" timestamp with time zone,
	"conversationType" text,
	"isGroup" boolean,
	"locale" text,
	"teamId" text,
	"teamName" text,
	"channelName" text,
	CONSTRAINT "bot_conversations_channel_conversation_id_unique" UNIQUE("channelConversationId")
);
--> statement-breakpoint
CREATE TABLE "bot_adapter"."llmCalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"conversationId" uuid,
	"userId" uuid,
	"userMessageId" uuid,
	"assistantMessageId" uuid,
	"activityId" text,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"errorMessage" text,
	"inputTokens" integer,
	"cachedInputTokens" integer,
	"outputTokens" integer,
	"reasoningTokens" integer,
	"totalTokens" integer,
	"latencyMs" integer,
	"toolCalls" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "bot_adapter"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"conversationId" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"activityId" text
);
--> statement-breakpoint
CREATE TABLE "bot_adapter"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"teamsUserId" text NOT NULL,
	"aadObjectId" text,
	"tenantId" text,
	"name" text,
	"email" text,
	"givenName" text,
	"surname" text,
	"userPrincipalName" text,
	CONSTRAINT "bot_users_teams_user_id_unique" UNIQUE("teamsUserId")
);
--> statement-breakpoint
ALTER TABLE "bot_adapter"."conversations" ADD CONSTRAINT "bot_conversations_user_id_bot_users_id_fk" FOREIGN KEY ("userId") REFERENCES "bot_adapter"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_adapter"."llmCalls" ADD CONSTRAINT "bot_llm_calls_conversation_id_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "bot_adapter"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_adapter"."llmCalls" ADD CONSTRAINT "bot_llm_calls_user_id_bot_users_id_fk" FOREIGN KEY ("userId") REFERENCES "bot_adapter"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_adapter"."llmCalls" ADD CONSTRAINT "bot_llm_calls_user_message_id_bot_messages_id_fk" FOREIGN KEY ("userMessageId") REFERENCES "bot_adapter"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_adapter"."llmCalls" ADD CONSTRAINT "bot_llm_calls_assistant_message_id_bot_messages_id_fk" FOREIGN KEY ("assistantMessageId") REFERENCES "bot_adapter"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_adapter"."messages" ADD CONSTRAINT "bot_messages_conversation_id_bot_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "bot_adapter"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_userId_index" ON "bot_adapter"."conversations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "conversations_lastMessageAt_index" ON "bot_adapter"."conversations" USING btree ("lastMessageAt");--> statement-breakpoint
CREATE INDEX "llmCalls_conversationId_createdAt_index" ON "bot_adapter"."llmCalls" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "llmCalls_userId_index" ON "bot_adapter"."llmCalls" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "llmCalls_status_index" ON "bot_adapter"."llmCalls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_conversationId_createdAt_index" ON "bot_adapter"."messages" USING btree ("conversationId","createdAt");--> statement-breakpoint
CREATE INDEX "users_aadObjectId_index" ON "bot_adapter"."users" USING btree ("aadObjectId");