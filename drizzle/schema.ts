import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 腳本生成歷史紀錄。每一筆 = 一次雙引擎（或單引擎）產出的完整結果。
 * 取代原本前端 localStorage 的暫存做法，改為後端持久化、跨裝置可查。
 */
export const scriptHistory = mysqlTable("script_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 擁有者，對應 users.id，做資料隔離。 */
  userId: int("userId").notNull(),
  /** 產品名稱（顯示用摘要）。 */
  productName: varchar("productName", { length: 255 }).notNull(),
  /** 產業（已轉為中文標籤）。 */
  industry: varchar("industry", { length: 255 }).notNull(),
  /** 漏斗層級（已轉為中文標籤）。 */
  funnel: varchar("funnel", { length: 255 }).notNull(),
  /** 使用的引擎模式：dual / claude_only / gpt_only / both。 */
  engine: varchar("engine", { length: 32 }).notNull(),
  /** GPT 發散引擎產出的原始 Hook 草稿。 */
  gptOutput: text("gptOutput"),
  /** 最終整合腳本（Claude 或 GPT 整合後的模組化矩陣）。 */
  finalOutput: text("finalOutput").notNull(),
  /** 完整輸入參數快照（JSON 字串），方便日後重跑或稽核。 */
  inputSnapshot: text("inputSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScriptHistory = typeof scriptHistory.$inferSelect;
export type InsertScriptHistory = typeof scriptHistory.$inferInsert;