CREATE TABLE `script_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`industry` varchar(255) NOT NULL,
	`funnel` varchar(255) NOT NULL,
	`engine` varchar(32) NOT NULL,
	`gptOutput` text,
	`finalOutput` text NOT NULL,
	`inputSnapshot` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `script_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `script_matrix` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`industry` varchar(255) NOT NULL,
	`funnel` varchar(255) NOT NULL,
	`hooksJson` text NOT NULL,
	`bodiesJson` text NOT NULL,
	`ctasJson` text NOT NULL,
	`recommendationsJson` text NOT NULL,
	`inputSnapshot` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `script_matrix_id` PRIMARY KEY(`id`)
);
