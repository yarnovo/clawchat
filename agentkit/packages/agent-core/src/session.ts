/**
 * ChatSession — 管理单次对话的消息历史
 *
 * InMemorySession: 测试、一次性对话
 * SQLiteSession:   生产、容器内持久化（docker commit 能带走）
 */
import { createRequire } from 'module';
import type { ChatMessage } from './llm.js';

export interface ChatSession {
  getMessages(): ChatMessage[];
  addMessage(message: ChatMessage): void;
  clear(): void;
}

/**
 * 内存 Session — 重启就丢，适合测试
 */
export class InMemorySession implements ChatSession {
  private messages: ChatMessage[] = [];

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  addMessage(message: ChatMessage): void {
    this.messages.push(message);
  }

  clear(): void {
    this.messages = [];
  }
}

/**
 * SQLite Session — 持久化到文件，docker commit 能带走
 */
export class SQLiteSession implements ChatSession {
  private db: any;
  private sessionId: string;

  constructor(dbPath: string, sessionId?: string) {
    const require = createRequire(import.meta.url);
    const Database = require('better-sqlite3');
    this.db = new Database(dbPath);
    this.sessionId = sessionId || 'default';
    this.init();
  }

  private init(): void {
    this.db.exec(`
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
    const rows = this.db.prepare(
      'SELECT role, content, tool_call_id, tool_calls FROM messages WHERE session_id = ? ORDER BY id'
    ).all(this.sessionId) as Array<{
      role: string;
      content: string;
      tool_call_id: string | null;
      tool_calls: string | null;
    }>;

    return rows.map(row => {
      const msg: ChatMessage = {
        role: row.role as ChatMessage['role'],
        content: row.content,
      };
      if (row.tool_call_id) msg.tool_call_id = row.tool_call_id;
      if (row.tool_calls) msg.tool_calls = JSON.parse(row.tool_calls);
      return msg;
    });
  }

  addMessage(message: ChatMessage): void {
    this.db.prepare(
      'INSERT INTO messages (session_id, role, content, tool_call_id, tool_calls) VALUES (?, ?, ?, ?, ?)'
    ).run(
      this.sessionId,
      message.role,
      message.content,
      message.tool_call_id || null,
      message.tool_calls ? JSON.stringify(message.tool_calls) : null,
    );
  }

  clear(): void {
    this.db.prepare('DELETE FROM messages WHERE session_id = ?').run(this.sessionId);
  }

  close(): void {
    this.db.close();
  }
}
