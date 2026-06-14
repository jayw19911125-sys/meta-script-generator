import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
