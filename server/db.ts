import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertScriptHistory, InsertUser, scriptHistory, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========== 腳本歷史紀錄 CRUD ==========

/** 新增一筆生成紀錄，回傳 insertId。 */
export async function insertScriptHistory(
  record: InsertScriptHistory
): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert script history: database not available");
    return null;
  }
  const result = await db.insert(scriptHistory).values(record);
  // mysql2 driver 回傳的 insertId 位於第一個元素
  const insertId = (result as unknown as Array<{ insertId: number }>)[0]?.insertId;
  return typeof insertId === "number" ? insertId : null;
}

/** 取得指定用戶的歷史紀錄（最新在前，預設上限 50 筆）。 */
export async function listScriptHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list script history: database not available");
    return [];
  }
  return db
    .select()
    .from(scriptHistory)
    .where(eq(scriptHistory.userId, userId))
    .orderBy(desc(scriptHistory.createdAt))
    .limit(limit);
}

/** 刪除指定用戶的單筆紀錄（雙條件確保只能刪自己的）。 */
export async function deleteScriptHistory(
  userId: number,
  id: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete script history: database not available");
    return;
  }
  await db
    .delete(scriptHistory)
    .where(and(eq(scriptHistory.id, id), eq(scriptHistory.userId, userId)));
}
