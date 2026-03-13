import WebSocket from "ws";
import { randomUUID } from "crypto";

// OpenClaw Gateway WebSocket client
// Implements the Gateway protocol for chat.send / chat.event

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  seq: number;
  state: "delta" | "final" | "aborted" | "error";
  message?: { content?: string };
  errorMessage?: string;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<
    string,
    { resolve: (v: ChatEvent[]) => void; reject: (e: Error) => void; events: ChatEvent[] }
  >();

  constructor(
    private url: string,
    private token: string,
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        // Authenticate
        this.send({
          id: randomUUID(),
          method: "auth",
          params: { token: this.token },
        });
        resolve();
      });

      this.ws.on("message", (data) => {
        try {
          const frame = JSON.parse(data.toString());
          this.handleFrame(frame);
        } catch {
          // ignore malformed frames
        }
      });

      this.ws.on("error", (err) => reject(err));
      this.ws.on("close", () => {
        this.ws = null;
      });
    });
  }

  private handleFrame(frame: Record<string, unknown>) {
    // Response to a request
    if (frame["id"] && typeof frame["id"] === "string") {
      const id = frame["id"] as string;
      const entry = this.pending.get(id);
      if (entry) {
        if (frame["error"]) {
          entry.reject(
            new Error(
              (frame["error"] as Record<string, string>)?.message ||
                "Gateway error",
            ),
          );
          this.pending.delete(id);
          return;
        }
      }
    }

    // Chat event (streaming response)
    if (frame["type"] === "chat.event") {
      const payload = frame["payload"] as ChatEvent;
      if (!payload) return;

      // Find pending request by runId match
      for (const [id, entry] of this.pending) {
        entry.events.push(payload);

        if (
          payload.state === "final" ||
          payload.state === "aborted" ||
          payload.state === "error"
        ) {
          entry.resolve(entry.events);
          this.pending.delete(id);
        }
        break;
      }
    }
  }

  private send(frame: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Gateway not connected");
    }
    this.ws.send(JSON.stringify(frame));
  }

  // Send a chat message and wait for the full response
  async chat(
    sessionKey: string,
    message: string,
    timeoutMs = 60000,
  ): Promise<string> {
    const id = randomUUID();

    const promise = new Promise<ChatEvent[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, events: [] });

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("Chat request timed out"));
        }
      }, timeoutMs);
    });

    this.send({
      id,
      method: "chat.send",
      params: {
        sessionKey,
        message,
        idempotencyKey: randomUUID(),
      },
    });

    const events = await promise;

    // Collect all delta content into final response
    const parts: string[] = [];
    for (const evt of events) {
      if (evt.state === "error") {
        throw new Error(evt.errorMessage || "Agent error");
      }
      if (evt.message?.content) {
        parts.push(evt.message.content);
      }
    }
    return parts.join("");
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
