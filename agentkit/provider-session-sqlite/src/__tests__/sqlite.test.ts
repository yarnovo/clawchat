import { describe, it, expect, afterEach } from 'vitest';
import { SQLiteSession } from '../index.js';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

function tmpDbPath(): string {
  return join(tmpdir(), `agentkit-test-${randomUUID()}.db`);
}

describe('SQLiteSession', () => {
  const cleanupPaths: string[] = [];

  function createSession(sessionId?: string): SQLiteSession {
    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);
    return new SQLiteSession(dbPath, sessionId);
  }

  afterEach(() => {
    for (const p of cleanupPaths) {
      try {
        if (existsSync(p)) unlinkSync(p);
        // WAL mode may create -wal and -shm files
        if (existsSync(p + '-wal')) unlinkSync(p + '-wal');
        if (existsSync(p + '-shm')) unlinkSync(p + '-shm');
      } catch {
        // ignore cleanup errors
      }
    }
    cleanupPaths.length = 0;
  });

  // ----------------------------------------------------------------
  // Constructor
  // ----------------------------------------------------------------

  it('creates db file and auto-creates table', () => {
    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);
    expect(existsSync(dbPath)).toBe(false);

    const session = new SQLiteSession(dbPath);
    expect(existsSync(dbPath)).toBe(true);

    // Table should exist — querying it should not throw
    expect(() => session.getMessages()).not.toThrow();
    session.close();
  });

  it('uses "default" as the default sessionId', () => {
    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);

    const session = new SQLiteSession(dbPath);
    session.addMessage({ role: 'user', content: 'hello' });

    // Open a second handle with explicit 'default' — should see the same message
    const session2 = new SQLiteSession(dbPath, 'default');
    const msgs = session2.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe('hello');

    session.close();
    session2.close();
  });

  it('supports custom sessionId', () => {
    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);

    const session = new SQLiteSession(dbPath, 'custom-session');
    session.addMessage({ role: 'user', content: 'in custom' });

    // Default session should be empty
    const defaultSession = new SQLiteSession(dbPath, 'default');
    expect(defaultSession.getMessages()).toHaveLength(0);

    // Custom session has the message
    expect(session.getMessages()).toHaveLength(1);
    expect(session.getMessages()[0].content).toBe('in custom');

    session.close();
    defaultSession.close();
  });

  // ----------------------------------------------------------------
  // getMessages
  // ----------------------------------------------------------------

  it('getMessages returns empty array initially', () => {
    const session = createSession();
    expect(session.getMessages()).toEqual([]);
    session.close();
  });

  // ----------------------------------------------------------------
  // addMessage
  // ----------------------------------------------------------------

  it('addMessage stores message and getMessages retrieves it', () => {
    const session = createSession();
    session.addMessage({ role: 'user', content: 'hi' });

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].content).toBe('hi');
    session.close();
  });

  it('addMessage stores role and content correctly', () => {
    const session = createSession();

    session.addMessage({ role: 'system', content: 'You are helpful.' });
    session.addMessage({ role: 'user', content: 'Question?' });
    session.addMessage({ role: 'assistant', content: 'Answer.' });

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(3);
    expect(msgs[0]).toMatchObject({ role: 'system', content: 'You are helpful.' });
    expect(msgs[1]).toMatchObject({ role: 'user', content: 'Question?' });
    expect(msgs[2]).toMatchObject({ role: 'assistant', content: 'Answer.' });
    session.close();
  });

  it('addMessage stores tool_call_id', () => {
    const session = createSession();
    session.addMessage({
      role: 'tool',
      content: '{"result": 42}',
      tool_call_id: 'call_abc123',
    });

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe('tool');
    expect(msgs[0].tool_call_id).toBe('call_abc123');
    expect(msgs[0].content).toBe('{"result": 42}');
    session.close();
  });

  it('addMessage stores tool_calls as JSON string', () => {
    const toolCalls = [
      { id: 'call_1', name: 'get_weather', arguments: '{"city":"Tokyo"}' },
      { id: 'call_2', name: 'get_time', arguments: '{"tz":"Asia/Tokyo"}' },
    ];

    const session = createSession();
    session.addMessage({
      role: 'assistant',
      content: '',
      tool_calls: toolCalls,
    });

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].tool_calls).toEqual(toolCalls);
    session.close();
  });

  it('getMessages parses tool_calls back from JSON', () => {
    const toolCalls = [
      { id: 'call_x', name: 'search', arguments: '{"query":"test"}' },
    ];

    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);

    // Write with one session handle
    const writer = new SQLiteSession(dbPath, 'tc');
    writer.addMessage({ role: 'assistant', content: '', tool_calls: toolCalls });
    writer.close();

    // Read with a fresh session handle — proves it survived serialization
    const reader = new SQLiteSession(dbPath, 'tc');
    const msgs = reader.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].tool_calls).toEqual(toolCalls);
    expect(Array.isArray(msgs[0].tool_calls)).toBe(true);
    reader.close();
  });

  // ----------------------------------------------------------------
  // Multiple messages ordering
  // ----------------------------------------------------------------

  it('returns multiple messages in insertion order', () => {
    const session = createSession();

    session.addMessage({ role: 'system', content: 'sys' });
    session.addMessage({ role: 'user', content: 'u1' });
    session.addMessage({ role: 'assistant', content: 'a1' });
    session.addMessage({ role: 'user', content: 'u2' });
    session.addMessage({ role: 'assistant', content: 'a2' });

    const msgs = session.getMessages();
    expect(msgs.map(m => m.content)).toEqual(['sys', 'u1', 'a1', 'u2', 'a2']);
    session.close();
  });

  // ----------------------------------------------------------------
  // clear
  // ----------------------------------------------------------------

  it('clear removes all messages for the session', () => {
    const session = createSession();
    session.addMessage({ role: 'user', content: 'one' });
    session.addMessage({ role: 'assistant', content: 'two' });
    expect(session.getMessages()).toHaveLength(2);

    session.clear();
    expect(session.getMessages()).toEqual([]);
    session.close();
  });

  it("clear doesn't affect other sessions", () => {
    const dbPath = tmpDbPath();
    cleanupPaths.push(dbPath);

    const sessionA = new SQLiteSession(dbPath, 'a');
    const sessionB = new SQLiteSession(dbPath, 'b');

    sessionA.addMessage({ role: 'user', content: 'from A' });
    sessionB.addMessage({ role: 'user', content: 'from B' });

    // Clear session A
    sessionA.clear();

    expect(sessionA.getMessages()).toEqual([]);
    expect(sessionB.getMessages()).toHaveLength(1);
    expect(sessionB.getMessages()[0].content).toBe('from B');

    sessionA.close();
    sessionB.close();
  });

  // ----------------------------------------------------------------
  // close
  // ----------------------------------------------------------------

  it('close closes the database', () => {
    const session = createSession();
    session.addMessage({ role: 'user', content: 'before close' });
    session.close();

    // After close, operations on the raw db should throw
    expect(() => session.getMessages()).toThrow();
  });

  // ----------------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------------

  it('message without tool_call_id or tool_calls omits those fields', () => {
    const session = createSession();
    session.addMessage({ role: 'user', content: 'plain message' });

    const msgs = session.getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toEqual({ role: 'user', content: 'plain message' });
    // Ensure optional fields are truly absent (not undefined)
    expect('tool_call_id' in msgs[0]).toBe(false);
    expect('tool_calls' in msgs[0]).toBe(false);
    session.close();
  });
});
