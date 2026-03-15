/**
 * Drizzle schema — SQLite 表结构定义
 * 类型安全，schema 即类型
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  role: text('role', { enum: ['system', 'user', 'assistant', 'tool'] }).notNull(),
  content: text('content').notNull(),
  toolCallId: text('tool_call_id'),
  toolCalls: text('tool_calls'), // JSON string
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

/** 从 schema 推导的类型 */
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
