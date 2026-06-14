CREATE TABLE `notion_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attemptAt` timestamp NOT NULL DEFAULT (now()),
	`source` varchar(32) NOT NULL DEFAULT 'api',
	`successCount` int NOT NULL DEFAULT 0,
	`failCount` int NOT NULL DEFAULT 0,
	`usedFallback` boolean NOT NULL DEFAULT false,
	`partialSuccess` boolean NOT NULL DEFAULT false,
	`failedPagesJson` text,
	`triggeredBy` varchar(64) DEFAULT 'system',
	CONSTRAINT `notion_sync_logs_id` PRIMARY KEY(`id`)
);
