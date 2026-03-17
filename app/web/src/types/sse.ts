export type SSEEvent =
  | { type: 'connected'; connectionId?: string }
  | { type: 'typing'; isTyping?: boolean; requestId?: string }
  | { type: 'assistant'; text?: string; content?: string; requestId?: string }
  | { type: 'error'; message: string; requestId?: string }
  | { type: 'aborted'; requestId?: string }
