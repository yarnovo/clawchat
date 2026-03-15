export type SSEEvent =
  | { type: 'connected'; connectionId: string }
  | { type: 'typing' }
  | { type: 'assistant'; content: string; requestId?: string }
