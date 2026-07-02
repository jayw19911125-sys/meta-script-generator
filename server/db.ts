import { and, desc, eq, gte, like, lt, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertNotionSyncLog, InsertScriptHistory, InsertScriptMatrixRow, InsertUser, notionSyncLogs, scriptHistory, scriptMatrix, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ========== 腳本歷史紀錄 CRUD ==========

export async function insertScriptHistory(record: InsertScriptHistory): Promise<number | null> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot insert script history: database not available"); return null; }
  const result = await db.insert(scriptHistory).values(record);
  const insertId = (result as unknown as Array<{ insertId: number }>)[0]?.insertId;
  return typeof insertId === "number" ? insertId : null;
}

export async function listScriptHistory(
  userId: number,
  limit = 20,
  opts?: { keyword?: string; funnel?: string; dateFrom?: string; dateTo?: string; cursor?: number }
) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot list script history: database not available"); return []; }
  const conditions = [eq(scriptHistory.userId, userId)];
  if (opts?.keyword) {
    // Escape LIKE wildcards to prevent unintended pattern matching
    const escaped = opts.keyword.replace(/[%_\\]/g, (c) => `\\${c}`);
    const kw = `%${escaped}%`;
    conditions.push(or(
      like(scriptHistory.productName, kw),
      like(scriptHistory.industry, kw),
      like(scriptHistory.finalOutput, kw)
    )!);
  }
  if (opts?.funnel) {
    conditions.push(eq(scriptHistory.funnel, opts.funnel));
  }
  if (opts?.dateFrom) {
    const fromDate = new Date(opts.dateFrom);
    if (!isNaN(fromDate.getTime())) conditions.push(gte(scriptHistory.createdAt, fromDate));
  }
  if (opts?.dateTo) {
    // dateTo 包含當天：加到当天結束 23:59:59
    const toDate = new Date(opts.dateTo);
    if (!isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(scriptHistory.createdAt, toDate));
    }
  }
  // Cursor-based pagination: fetch records with id < cursor (older records)
  if (opts?.cursor != null) {
    conditions.push(lt(scriptHistory.id, opts.cursor));
  }
  // Fetch limit+1 to determine if there are more pages
  const rows = await db.select().from(scriptHistory)
    .where(and(...conditions))
    .orderBy(desc(scriptHistory.createdAt))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return { items, hasMore, nextCursor };
}

export async function deleteScriptHistory(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot delete script history: database not available"); return; }
  await db.delete(scriptHistory).where(and(eq(scriptHistory.id, id), eq(scriptHistory.userId, userId)));
}

// ========== 矩陣歷史紀錄 CRUD ==========

export async function insertScriptMatrix(record: InsertScriptMatrixRow): Promise<number | null> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot insert script matrix: database not available"); return null; }
  const result = await db.insert(scriptMatrix).values(record);
  const insertId = (result as unknown as Array<{ insertId: number }>)[0]?.insertId;
  return typeof insertId === "number" ? insertId : null;
}

export async function listScriptMatrix(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot list script matrix: database not available"); return []; }
  return db.select().from(scriptMatrix).where(eq(scriptMatrix.userId, userId)).orderBy(desc(scriptMatrix.createdAt)).limit(limit);
}

export async function deleteScriptMatrix(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot delete script matrix: database not available"); return; }
  await db.delete(scriptMatrix).where(and(eq(scriptMatrix.id, id), eq(scriptMatrix.userId, userId)));
}

// ========== Notion 同步記錄 CRUD ==========

export async function insertNotionSyncLog(record: InsertNotionSyncLog): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot insert sync log: database not available"); return; }
  await db.insert(notionSyncLogs).values(record);
}

export async function listNotionSyncLogs(limit = 10) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot list sync logs: database not available"); return []; }
  return db.select().from(notionSyncLogs).orderBy(desc(notionSyncLogs.attemptAt)).limit(limit);
}
