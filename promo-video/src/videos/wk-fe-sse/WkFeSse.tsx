import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { Subtitle } from "../../Subtitle";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

import clientWords from "./words/wkfesse-client-words.json";
import hookWords from "./words/wkfesse-hook-words.json";
import chatWords from "./words/wkfesse-chat-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

/* ------------------------------------------------------------------ */
/*  Scene 1 — sse-client.ts walkthrough                               */
/* ------------------------------------------------------------------ */
const SSE_CLIENT_CODE = `export function connectSSE(
  url: string,
  onEvent: (event: SSEEvent) => void,
  onError: (error: Error) => void,
): SSEConnection {
  const controller = new AbortController()
  void startStream(url, controller.signal,
    onEvent, onError)
  return { close: () => controller.abort() }
}`;

const STREAM_CODE = `const res = await fetch(url, {
  signal,
  headers: { Accept: 'text/event-stream' },
});
const reader = res.body?.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (!signal.aborted) {
  const { done, value } = await reader.read();
  buffer += decoder.decode(value, { stream: true });
  // split by \\n, parse data: lines
}`;

const SceneClient: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const rightProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.8 } });
  const flowProg = spring({ frame: frame - 55, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 22,
          paddingTop: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          sse-client.ts 走读
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            ~80 lines
          </span>
        </div>

        {/* Two code blocks */}
        <div
          style={{
            display: "flex",
            gap: 24,
            width: "92%",
            maxWidth: 1560,
            alignItems: "flex-start",
          }}
        >
          {/* connectSSE */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              connectSSE -- 入口函数
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 22px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {SSE_CLIENT_CODE.split("\n").map((line, i) => {
                  const isType = line.includes("SSEEvent") || line.includes("SSEConnection") || line.includes("string");
                  const isAbort = line.includes("AbortController") || line.includes("abort");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isAbort
                            ? "#E05252"
                            : isType
                              ? "#5B8DEF"
                              : COLORS.text,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* startStream */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              startStream -- ReadableStream 循环
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 22px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {STREAM_CODE.split("\n").map((line, i) => {
                  const isFetch = line.includes("fetch") || line.includes("signal");
                  const isReader = line.includes("reader") || line.includes("decoder") || line.includes("TextDecoder");
                  const isLoop = line.includes("while") || line.includes("read()");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isFetch
                            ? "#5B8DEF"
                            : isReader
                              ? "#6DC5A1"
                              : isLoop
                                ? COLORS.accent
                                : COLORS.text,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>

        {/* Data flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["fetch(url)", "\u2192", "ReadableStream", "\u2192", "TextDecoder", "\u2192", "split \\n\\n", "\u2192", "JSON.parse"].map(
            (step, i) => (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: i % 2 === 1 ? 24 : 19,
                  fontWeight: i % 2 === 0 ? 600 : 400,
                  color: i % 2 === 1 ? COLORS.subtle : COLORS.text,
                  padding: i % 2 === 0 ? "8px 16px" : "0",
                  borderRadius: i % 2 === 0 ? 10 : 0,
                  background: i % 2 === 0 ? COLORS.card : "transparent",
                  border: i % 2 === 0 ? `1px solid ${COLORS.border}` : "none",
                  boxShadow: i % 2 === 0 ? COLORS.cardShadow : "none",
                }}
              >
                {step}
              </div>
            ),
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2 — use-sse.ts walkthrough                                  */
/* ------------------------------------------------------------------ */
const HOOK_CODE = `export function useSSE(url: string | null) {
  const [status, setStatus] =
    useState<SSEStatus>('disconnected')
  const backoffRef = useRef(INITIAL_BACKOFF) // 1s
  const reconnectTimerRef = useRef<...>(undefined)
  const connectionRef = useRef<...>(null)

  const connect = useCallback(() => {
    connectionRef.current?.close()
    setStatus('connecting')
    const conn = connectSSE(url, (event) => {
      switch (event.type) {
        case 'connected':
          setStatus('connected')
          backoffRef.current = INITIAL_BACKOFF
          break
        case 'typing':
          setTyping(true)
          break
      }
    }, (error) => {
      setStatus('disconnected')
      scheduleReconnect()
    })
    connectionRef.current = conn
  }, [url])`;

const STATUS_FLOW = [
  { status: "disconnected", color: COLORS.muted },
  { status: "connecting", color: "#E8A838" },
  { status: "connected", color: "#6DC5A1" },
];

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const statusProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });
  const hooksProg = spring({ frame: frame - 65, fps, config: { damping: 12 } });

  const activeIdx = Math.floor((frame % 90) / 30);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingTop: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          use-sse.ts 走读
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            ~105 lines
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            width: "92%",
            maxWidth: 1560,
            alignItems: "flex-start",
          }}
        >
          {/* Code block */}
          <div
            style={{
              flex: 3,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              useSSE -- React Hook
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "16px 20px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {HOOK_CODE.split("\n").map((line, i) => {
                  const isStatus = line.includes("Status") || line.includes("setStatus") || line.includes("'connected'") || line.includes("'connecting'") || line.includes("'disconnected'");
                  const isBackoff = line.includes("backoff") || line.includes("INITIAL_BACKOFF") || line.includes("reconnect");
                  const isRef = line.includes("useRef") || line.includes("useState") || line.includes("useCallback");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isStatus
                            ? "#6DC5A1"
                            : isBackoff
                              ? "#E8A838"
                              : isRef
                                ? "#5B8DEF"
                                : COLORS.text,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* Status + lifecycle panel */}
          <div
            style={{
              flex: 2,
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Status indicator */}
            <div
              style={{
                opacity: interpolate(statusProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(statusProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                SSEStatus
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {STATUS_FLOW.map((s, i) => (
                  <div
                    key={s.status}
                    style={{
                      flex: 1,
                      padding: "14px 16px",
                      borderRadius: 10,
                      background: i === activeIdx ? s.color : COLORS.card,
                      border: `2px solid ${i === activeIdx ? s.color : COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      textAlign: "center",
                      transition: "all 0.3s",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        fontWeight: 700,
                        color: i === activeIdx ? COLORS.white : s.color,
                      }}
                    >
                      {s.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lifecycle hooks */}
            <div
              style={{
                opacity: interpolate(hooksProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(hooksProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                Lifecycle
              </div>
              {[
                { hook: "useEffect (mount)", action: "connect()" },
                { hook: "useEffect (unmount)", action: "close() + clearTimeout" },
                { hook: "visibilitychange", action: "reconnect()" },
                { hook: "connected event", action: "reset backoff to 1s" },
              ].map((item, i) => {
                const delay = 65 + i * 8;
                const prog = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={item.hook}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 8,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [16, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 16,
                        color: COLORS.text,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: COLORS.cardShadow,
                        minWidth: 200,
                      }}
                    >
                      {item.hook}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        color: COLORS.subtle,
                      }}
                    >
                      {"\u2192"}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 16,
                        fontWeight: 600,
                        color: COLORS.accent,
                      }}
                    >
                      {item.action}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3 — use-chat.ts walkthrough                                 */
/* ------------------------------------------------------------------ */
const CHAT_CODE = `export function useChat(conversationId: string | null) {
  const messages = useChatStore(s =>
    s.messagesByConversation[conversationId] ?? [])
  const isTyping = useChatStore(s => s.isTyping)
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)

  const send = useCallback(async (text, agentId) => {
    const messageId = crypto.randomUUID()

    // 1. Optimistic: add user message
    addMessage(conversationId, {
      id: messageId, role: 'user',
      content: text, status: 'sending',
    })

    try {
      // 2. POST to server
      const { requestId } = await chatSend(agentId, text)
      updateMessage(conversationId, messageId,
        { status: 'sent', requestId })
    } catch {
      // 3. Mark error
      updateMessage(conversationId, messageId,
        { status: 'error' })
    }
  }, [conversationId])

  return { messages, isTyping, send }
}`;

const optimisticSteps = [
  { step: "1", label: "addMessage", status: "sending", color: "#E8A838" },
  { step: "2", label: "chatSend()", status: "sent", color: "#5B8DEF" },
  { step: "3a", label: "updateMessage", status: "complete", color: "#6DC5A1" },
  { step: "3b", label: "updateMessage", status: "error", color: "#E05252" },
];

const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const flowProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.12, 0.3, 0.12],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingTop: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          use-chat.ts 走读
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            ~46 lines
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            width: "92%",
            maxWidth: 1560,
            alignItems: "flex-start",
          }}
        >
          {/* Code block */}
          <div
            style={{
              flex: 3,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              useChat -- 乐观更新模式
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "16px 20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight optimistic section */}
              <div
                style={{
                  position: "absolute",
                  top: 175,
                  left: 0,
                  right: 0,
                  height: 65,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {CHAT_CODE.split("\n").map((line, i) => {
                  const isOptimistic = line.includes("addMessage") || line.includes("Optimistic");
                  const isSend = line.includes("chatSend") || line.includes("requestId");
                  const isError = line.includes("error") || line.includes("catch");
                  const isStatus = line.includes("status:");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isOptimistic
                            ? "#E8A838"
                            : isSend
                              ? "#5B8DEF"
                              : isError
                                ? "#E05252"
                                : isStatus
                                  ? "#6DC5A1"
                                  : COLORS.text,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* Optimistic update flow */}
          <div
            style={{
              flex: 2,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              opacity: interpolate(flowProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(flowProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              Optimistic Update Flow
            </div>
            {optimisticSteps.map((item, i) => {
              const delay = 40 + i * 10;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 800,
                      color: item.color,
                      width: 44,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "12px 18px",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 16,
                        color: item.color,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: item.color,
                        }}
                      />
                      status: {`'${item.status}'`}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Store deps */}
            <div
              style={{
                marginTop: 12,
                opacity: interpolate(flowProg, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                Dependencies
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["api-client", "chat-store"].map((dep) => (
                  <div
                    key={dep}
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.text,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                    }}
                  >
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Composition                                                       */
/* ------------------------------------------------------------------ */
const SCENE_COMPS = [SceneClient, SceneHook, SceneChat];
const SCENE_WORDS = [clientWords, hookWords, chatWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  const endFrame = isLast
    ? Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD
    : Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i] };
});

export const WK_FE_SSE_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const WkFeSse: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
    <Audio src={staticFile("audio/wk-fe-sse/wk-fe-sse.mp3")} volume={0.9} />
    {scenes.map((s, i) => {
      const isLast = i === scenes.length - 1;
      const seqDur = isLast ? s.dur : s.dur + FADE;
      const Comp = SCENE_COMPS[i];
      const sceneStartMs = (s.from / FPS) * 1000;
      return (
        <Sequence key={i} from={s.from} durationInFrames={seqDur}>
          <Scene dur={seqDur} isLast={isLast}>
            <Comp />
            <AbsoluteFill style={{ zIndex: 100 }}>
              <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
            </AbsoluteFill>
          </Scene>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
