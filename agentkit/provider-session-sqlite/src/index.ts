/**
 * SQLiteSession — 持久化会话（docker commit 能带走）
 */
import { createRequire } from 'module';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { messages } from './schema.js';
import type { ChatSession, ChatMessage } from '@agentkit/core';

export class SQLiteSession implements ChatSession {
  private db: ReturnType<typeof drizzle>;
  private rawDb: any;
  private sessionId: string;

  constructor(dbPath: string, sessionId?: string) {
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3');
    this.rawDb = new Database(dbPath);
    this.db = drizzle(this.rawDb);
    this.sessionId = sessionId || 'default';

    // 自动建表
    this.rawDb.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_call_id TEXT,
        tool_calls TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_session ON messages(session_id);
    `);
  }

  getMessages(): ChatMessage[] {
    const rows = this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, this.sessionId))
      .all();

    return rows.map(row => {
      const msg: ChatMessage = {
        role: row.role,
        content: row.content,
      };
      if (row.toolCallId) msg.tool_call_id = row.toolCallId;
      if (row.toolCalls) msg.tool_calls = JSON.parse(row.toolCalls);
      return msg;
    });
  }

  addMessage(message: ChatMessage): void {
    this.db.insert(messages).values({
      sessionId: this.sessionId,
      role: message.role,
      content: message.content,
      toolCallId: message.tool_call_id || null,
      toolCalls: message.tool_calls ? JSON.stringify(message.tool_calls) : null,
    }).run();
  }

  clear(): void {
    this.db.delete(messages).where(eq(messages.sessionId, this.sessionId)).run();
  }

  close(): void {
    this.rawDb.close();
  }
}
