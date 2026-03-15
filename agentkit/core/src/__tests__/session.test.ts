import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import { InMemorySession, SQLiteSession } from '../session.js';

describe('InMemorySession', () => {
  it('stores and retrieves messages', () => {
    const s = new InMemorySession();
    s.addMessage({ role: 'user', content: 'hello' });
    s.addMessage({ role: 'assistant', content: 'hi' });
    expect(s.getMessages()).toHaveLength(2);
    expect(s.getMessages()[0].content).toBe('hello');
  });

  it('clears messages', () => {
    const s = new InMemorySession();
    s.addMessage({ role: 'user', content: 'hello' });
    s.clear();
    expect(s.getMessages()).toHaveLength(0);
  });

  it('returns copies, not references', () => {
    const s = new InMemorySession();
    s.addMessage({ role: 'user', content: 'hello' });
    const msgs = s.getMessages();
    msgs.push({ role: 'user', content: 'injected' });
    expect(s.getMessages()).toHaveLength(1);
  });
});

describe('SQLiteSession', () => {
  const dbPath = '/tmp/test-session-vitest.db';

  afterEach(() => {
    try { fs.unlinkSync(dbPath); } catch {}
  });

  it('persists messages across instances', () => {
    const s1 = new SQLiteSession(dbPath, 'sess-1');
    s1.addMessage({ role: 'user', content: 'hello' });
    s1.addMessage({ role: 'assistant', content: 'hi' });
    s1.close();

    const s2 = new SQLiteSession(dbPath, 'sess-1');
    expect(s2.getMessages()).toHaveLength(2);
    expect(s2.getMessages()[1].content).toBe('hi');
    s2.close();
  });

  it('isolates sessions by id', () => {
    const s1 = new SQLiteSession(dbPath, 'sess-a');
    const s2 = new SQLiteSession(dbPath, 'sess-b');
    s1.addMessage({ role: 'user', content: 'from a' });
    s2.addMessage({ role: 'user', content: 'from b' });
    expect(s1.getMessages()).toHaveLength(1);
    expect(s2.getMessages()).toHaveLength(1);
    expect(s1.getMessages()[0].content).toBe('from a');
    expect(s2.getMessages()[0].content).toBe('from b');
    s1.close();
    s2.close();
  });

  it('stores tool_calls and tool_call_id', () => {
    const s = new SQLiteSession(dbPath, 'tools');
    s.addMessage({
      role: 'assistant',
      content: '',
      tool_calls: [{ id: 'tc1', name: 'calc', arguments: '{"x":1}' }],
    });
    s.addMessage({ role: 'tool', content: '42', tool_call_id: 'tc1' });

    const msgs = s.getMessages();
    expect(msgs[0].tool_calls).toEqual([{ id: 'tc1', name: 'calc', arguments: '{"x":1}' }]);
    expect(msgs[1].tool_call_id).toBe('tc1');
    s.close();
  });

  it('clears only its own session', () => {
    const s1 = new SQLiteSession(dbPath, 'keep');
    const s2 = new SQLiteSession(dbPath, 'delete');
    s1.addMessage({ role: 'user', content: 'keep me' });
    s2.addMessage({ role: 'user', content: 'delete me' });
    s2.clear();
    expect(s1.getMessages()).toHaveLength(1);
    expect(s2.getMessages()).toHaveLength(0);
    s1.close();
    s2.close();
  });
});
