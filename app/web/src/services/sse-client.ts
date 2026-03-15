import type { SSEEvent } from '@/types'

interface SSEConnection {
  close: () => void
}

export function connectSSE(
  url: string,
  onEvent: (event: SSEEvent) => void,
  onError: (error: Error) => void,
): SSEConnection {
  const controller = new AbortController()

  void startStream(url, controller.signal, onEvent, onError)

  return {
    close: () => controller.abort(),
  }
}

async function startStream(
  url: string,
  signal: AbortSignal,
  onEvent: (event: SSEEvent) => void,
  onError: (error: Error) => void,
): Promise<void> {
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: 'text/event-stream' },
    })

    if (!res.ok) {
      onError(new Error(`SSE connection failed: ${res.status}`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError(new Error('No response body'))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (!signal.aborted) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep incomplete last line in buffer
      buffer = lines.pop() ?? ''

      let dataLines: string[] = []

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          dataLines.push(line.slice(6))
        } else if (line === '') {
          // Empty line = end of event
          if (dataLines.length > 0) {
            const data = dataLines.join('\n')
            try {
              const parsed = JSON.parse(data) as SSEEvent
              onEvent(parsed)
            } catch {
              // Skip malformed JSON
            }
            dataLines = []
          }
        }
      }
    }
  } catch (err) {
    if (signal.aborted) return
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
