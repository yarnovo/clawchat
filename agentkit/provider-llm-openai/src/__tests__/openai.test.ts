import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatMessage, ToolDefinition } from '@agentkit/core';

// ── Mock OpenAI ──────────────────────────────────────────────────────────────
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = { completions: { create: mockCreate } };
      constructor(public opts: any) {}
    },
  };
});

import { OpenAIProvider } from '../index.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a mock OpenAI chat completion response */
function mockResponse(opts: {
  content?: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
  finish_reason?: string;
}) {
  return {
    choices: [
      {
        message: {
          content: opts.content ?? null,
          tool_calls: opts.tool_calls ?? undefined,
        },
        finish_reason: opts.finish_reason ?? 'stop',
      },
    ],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('OpenAIProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  // ── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('sets default model, maxTokens, temperature', () => {
      const provider = new OpenAIProvider({ apiKey: 'sk-test' });

      // Verify defaults by calling chat() and inspecting the create() args
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'hi' }));

      return provider.chat([{ role: 'user', content: 'hello' }]).then(() => {
        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs.model).toBe('gpt-4o');
        expect(callArgs.max_tokens).toBe(4096);
        expect(callArgs.temperature).toBe(0.7);
      });
    });

    it('accepts custom options', () => {
      const provider = new OpenAIProvider({
        apiKey: 'sk-custom',
        baseURL: 'https://custom.api.com/v1',
        model: 'qwen-turbo',
        maxTokens: 2048,
        temperature: 0.3,
      });

      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'ok' }));

      return provider.chat([{ role: 'user', content: 'test' }]).then(() => {
        const callArgs = mockCreate.mock.calls[0][0];
        expect(callArgs.model).toBe('qwen-turbo');
        expect(callArgs.max_tokens).toBe(2048);
        expect(callArgs.temperature).toBe(0.3);
      });
    });
  });

  // ── chat() ───────────────────────────────────────────────────────────────

  describe('chat()', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider({ apiKey: 'sk-test' });
    });

    it('calls OpenAI client with correct params', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'reply' }));

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ];
      const tools: ToolDefinition[] = [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the weather',
            parameters: { type: 'object', properties: { city: { type: 'string' } } },
          },
        },
      ];

      await provider.chat(messages, tools);

      expect(mockCreate).toHaveBeenCalledOnce();
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gpt-4o');
      expect(callArgs.max_tokens).toBe(4096);
      expect(callArgs.temperature).toBe(0.7);
      expect(callArgs.tools).toEqual(tools);
      expect(callArgs.messages).toHaveLength(2);
    });

    it('converts ChatMessage to OpenAI format (system, user, assistant, tool roles)', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'done' }));

      const messages: ChatMessage[] = [
        { role: 'system', content: 'sys prompt' },
        { role: 'user', content: 'user msg' },
        { role: 'assistant', content: 'assistant msg' },
        { role: 'tool', content: '{"result": 42}', tool_call_id: 'call_abc' },
      ];

      await provider.chat(messages);

      const converted = mockCreate.mock.calls[0][0].messages;
      expect(converted).toEqual([
        { role: 'system', content: 'sys prompt' },
        { role: 'user', content: 'user msg' },
        { role: 'assistant', content: 'assistant msg' },
        { role: 'tool', content: '{"result": 42}', tool_call_id: 'call_abc' },
      ]);
    });

    it('handles assistant messages with tool_calls', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'ok' }));

      const messages: ChatMessage[] = [
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            { id: 'call_1', name: 'get_weather', arguments: '{"city":"Tokyo"}' },
            { id: 'call_2', name: 'search', arguments: '{"q":"hello"}' },
          ],
        },
      ];

      await provider.chat(messages);

      const converted = mockCreate.mock.calls[0][0].messages;
      expect(converted[0]).toEqual({
        role: 'assistant',
        content: '',
        tool_calls: [
          { id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{"city":"Tokyo"}' } },
          { id: 'call_2', type: 'function', function: { name: 'search', arguments: '{"q":"hello"}' } },
        ],
      });
    });

    it('handles tool messages with tool_call_id', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'ok' }));

      const messages: ChatMessage[] = [
        { role: 'tool', content: '{"temp": 22}', tool_call_id: 'call_1' },
      ];

      await provider.chat(messages);

      const converted = mockCreate.mock.calls[0][0].messages;
      expect(converted[0]).toEqual({
        role: 'tool',
        content: '{"temp": 22}',
        tool_call_id: 'call_1',
      });
    });

    it('extracts tool_calls from response', async () => {
      mockCreate.mockResolvedValueOnce(
        mockResponse({
          content: null,
          tool_calls: [
            { id: 'call_abc', function: { name: 'get_weather', arguments: '{"city":"SF"}' } },
            { id: 'call_def', function: { name: 'search', arguments: '{"q":"test"}' } },
          ],
          finish_reason: 'tool_calls',
        }),
      );

      const result = await provider.chat([{ role: 'user', content: 'What is the weather?' }]);

      expect(result.content).toBeNull();
      expect(result.finish_reason).toBe('tool_calls');
      expect(result.tool_calls).toEqual([
        { id: 'call_abc', name: 'get_weather', arguments: '{"city":"SF"}' },
        { id: 'call_def', name: 'search', arguments: '{"q":"test"}' },
      ]);
    });

    it('returns content and finish_reason', async () => {
      mockCreate.mockResolvedValueOnce(
        mockResponse({ content: 'Hello, how can I help?', finish_reason: 'stop' }),
      );

      const result = await provider.chat([{ role: 'user', content: 'Hi' }]);

      expect(result.content).toBe('Hello, how can I help?');
      expect(result.finish_reason).toBe('stop');
      expect(result.tool_calls).toEqual([]);
    });

    it('handles response with no tool_calls', async () => {
      mockCreate.mockResolvedValueOnce(
        mockResponse({ content: 'Sure thing!' }),
      );

      const result = await provider.chat([{ role: 'user', content: 'Do something' }]);

      expect(result.tool_calls).toEqual([]);
      expect(result.content).toBe('Sure thing!');
      expect(result.finish_reason).toBe('stop');
    });

    it('passes tools as undefined when empty array is provided', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'ok' }));

      await provider.chat([{ role: 'user', content: 'test' }], []);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });

    it('passes tools as undefined when no tools provided', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: 'ok' }));

      await provider.chat([{ role: 'user', content: 'test' }]);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });
  });

  // ── toOpenAIMessage ──────────────────────────────────────────────────────

  describe('toOpenAIMessage (via chat conversion)', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider({ apiKey: 'sk-test' });
    });

    it('system message: only role and content', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'system', content: 'Be helpful' }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'system', content: 'Be helpful' });
      expect(msg).not.toHaveProperty('tool_call_id');
      expect(msg).not.toHaveProperty('tool_calls');
    });

    it('user message: only role and content', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'user', content: 'Hello' }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'user', content: 'Hello' });
      expect(msg).not.toHaveProperty('tool_call_id');
      expect(msg).not.toHaveProperty('tool_calls');
    });

    it('assistant message without tool_calls: only role and content', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'assistant', content: 'Hi there' }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'assistant', content: 'Hi there' });
      expect(msg).not.toHaveProperty('tool_calls');
    });

    it('assistant message with empty tool_calls array: no tool_calls in output', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'assistant', content: 'text', tool_calls: [] }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'assistant', content: 'text' });
      expect(msg).not.toHaveProperty('tool_calls');
    });

    it('assistant message with tool_calls: converts to OpenAI function format', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([
        {
          role: 'assistant',
          content: '',
          tool_calls: [{ id: 'tc1', name: 'fn1', arguments: '{}' }],
        },
      ]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg.tool_calls).toEqual([
        { id: 'tc1', type: 'function', function: { name: 'fn1', arguments: '{}' } },
      ]);
    });

    it('tool message: includes tool_call_id', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'tool', content: 'result', tool_call_id: 'tc1' }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'tool', content: 'result', tool_call_id: 'tc1' });
    });

    it('tool message without tool_call_id: no tool_call_id in output', async () => {
      mockCreate.mockResolvedValueOnce(mockResponse({ content: '' }));
      await provider.chat([{ role: 'tool', content: 'result' }]);

      const msg = mockCreate.mock.calls[0][0].messages[0];
      expect(msg).toEqual({ role: 'tool', content: 'result' });
      expect(msg).not.toHaveProperty('tool_call_id');
    });
  });
});
