CREATE TABLE `analytics_daily` (
	`date` text NOT NULL,
	`event` text NOT NULL,
	`device` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`date`, `event`, `device`)
);
--> statement-breakpoint
CREATE TABLE `analytics_visitors` (
	`date` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`device` text NOT NULL,
	PRIMARY KEY(`date`, `visitor_hash`)
);

