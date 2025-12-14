CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text,
	`team_id` text NOT NULL,
	`session_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`message` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'new',
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`chat_id` text,
	`email` text NOT NULL,
	`name` text,
	`subscribed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
ALTER TABLE `chats` ADD `welcome_message` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `chat_logo` text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `chats` ADD `lead_capture_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `chats` ADD `lead_capture_trigger` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `calendar_link` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `newsletter_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `chats` ADD `newsletter_trigger` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `widget_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `chats` ADD `embed_enabled` integer DEFAULT false;