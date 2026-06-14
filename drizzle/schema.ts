import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  approved: boolean("approved").default(true).notNull(), // true=已審核可使用, false=待審核
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 腳本生成歷史紀錄（雙引擎模式）
 */
export const scriptHistory = mysqlTable("script_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  funnel: varchar("funnel", { length: 255 }).notNull(),
  engine: varchar("engine", { length: 32 }).notNull(),
  gptOutput: text("gptOutput"),
  finalOutput: text("finalOutput").notNull(),
  inputSnapshot: text("inputSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScriptHistory = typeof scriptHistory.$inferSelect;
export type InsertScriptHistory = typeof scriptHistory.$inferInsert;

/**
 * 3-3-3 矩陣歷史紀錄
 */
export const scriptMatrix = mysqlTable("script_matrix", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }).notNull(),
  funnel: varchar("funnel", { length: 255 }).notNull(),
  hooksJson: text("hooksJson").notNull(),
  bodiesJson: text("bodiesJson").notNull(),
  ctasJson: text("ctasJson").notNull(),
  recommendationsJson: text("recommendationsJson").notNull(),
  inputSnapshot: text("inputSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScriptMatrixRow = typeof scriptMatrix.$inferSelect;
export type InsertScriptMatrixRow = typeof scriptMatrix.$inferInsert;

/**
 * Notion 知識庫同步記錄
 */
export const notionSyncLogs = mysqlTable("notion_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  attemptAt: timestamp("attemptAt").defaultNow().notNull(),
  source: varchar("source", { length: 32 }).notNull().default("api"), // api | embedded
  successCount: int("successCount").notNull().default(0),
  failCount: int("failCount").notNull().default(0),
  usedFallback: boolean("usedFallback").notNull().default(false),
  partialSuccess: boolean("partialSuccess").notNull().default(false),
  failedPagesJson: text("failedPagesJson"), // JSON: Array<{pageId, label, error}>
  triggeredBy: varchar("triggeredBy", { length: 64 }).default("system"), // system | admin
});

export type NotionSyncLog = typeof notionSyncLogs.$inferSelect;
export type InsertNotionSyncLog = typeof notionSyncLogs.$inferInsert;
