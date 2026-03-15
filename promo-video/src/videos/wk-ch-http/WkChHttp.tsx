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

import wkchOverviewWords from "./words/wkch-overview-words.json";
import wkchSseWords from "./words/wkch-sse-words.json";
import wkchChatWords from "./words/wkch-chat-words.json";
import wkchLifecycleWords from "./words/wkch-lifecycle-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_WORDS = [wkchOverviewWords, wkchSseWords, wkchChatWords, wkchLifecycleWords];

const SCENES = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], startMs: t.startMs };
});

export const WK_CH_HTTP_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;

/* ------------------------------------------------------------------ */
/*  Scene 1 — Overview                                                */
/* ------------------------------------------------------------------ */
const CHANNEL_INTERFACE_CODE = `export function httpChannel(
  opts: HttpPluginOptions = {}
): Channel {
  const port = opts.port || 4000;
  let server: Server | null = null;
  let sseClients = new Set<ServerResponse>();
  let loop: EventLoop;`;

const endpoints = [
  { method: "GET", path: "/api/events", desc: "SSE 实时推送" },
  { method: "POST", path: "/api/chat", desc: "聊天消息入口" },
  { method: "GET", path: "/api/info", desc: "Agent 信息查询" },
];

const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingTop: 50,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          channel-http 走读
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            ~97 lines
          </span>
        </div>

        {/* Code block */}
        <div
          style={{
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
            width: "85%",
            maxWidth: 1100,
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
            httpChannel -- Channel 工厂函数
          </div>
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "20px 24px",
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 17,
                lineHeight: 1.55,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {CHANNEL_INTERFACE_CODE.split("\n").map((line, i) => {
                const isType =
                  line.includes("Channel") ||
                  line.includes("Server") ||
                  line.includes("ServerResponse") ||
                  line.includes("EventLoop");
                const isKey =
                  line.includes("port") ||
                  line.includes("sseClients") ||
                  line.includes("loop");
                return (
                  <div key={i}>
                    <span
                      style={{
                        color: isType
                          ? "#5B8DEF"
                          : isKey
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

        {/* Endpoint table */}
        <div
          style={{
            width: "85%",
            maxWidth: 1100,
            opacity: interpolate(tableProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tableProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                padding: "10px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              {["Method", "Path", "Description"].map((h, idx) => (
                <div
                  key={h}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.muted,
                    letterSpacing: 2,
                    width: idx === 0 ? 120 : idx === 1 ? 400 : 400,
                    flexShrink: 0,
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            {endpoints.map((ep, i) => {
              const delay = 35 + i * 6;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={ep.path}
                  style={{
                    display: "flex",
                    padding: "12px 24px",
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.accent,
                      width: 120,
                      flexShrink: 0,
                    }}
                  >
                    {ep.method}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.text,
                      width: 400,
                      flexShrink: 0,
                    }}
                  >
                    {ep.path}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                      width: 400,
                      flexShrink: 0,
                    }}
                  >
                    {ep.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["Node.js http", "CORS", "Zero Dependencies"].map((tag) => (
            <div
              key={tag}
              style={{
                fontFamily: MONO,
                fontSize: 22,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2 — SSE endpoint                                            */
/* ------------------------------------------------------------------ */
const SSE_CODE = `// GET /api/events
if (url.pathname === '/api/events'
    && req.method === 'GET') {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: {"type":"connected"}\\n\\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
  return;
}`;

const BROADCAST_CODE = `function broadcast(data: object): void {
  const payload =
    \`data: \${JSON.stringify(data)}\\n\\n\`;
  for (const c of sseClients) c.write(payload);
}`;

const SceneSse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const sseProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const broadcastProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.8 } });
  const flowProg = spring({ frame: frame - 65, fps, config: { damping: 12 } });

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
          gap: 22,
          paddingTop: 50,
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
          SSE 端点
          <span
            style={{
              fontFamily: MONO,
              fontSize: 26,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            /api/events
          </span>
        </div>

        {/* Two code blocks */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "90%",
            maxWidth: 1500,
            alignItems: "flex-start",
          }}
        >
          {/* SSE handler */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(sseProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sseProg, [0, 1], [-20, 0])}px)`,
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
              SSE 连接处理
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight writeHead line */}
              <div
                style={{
                  position: "absolute",
                  top: 72,
                  left: 0,
                  right: 0,
                  height: 96,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {SSE_CODE.split("\n").map((line, i) => {
                  const isHeader =
                    line.includes("Content-Type") ||
                    line.includes("Cache-Control") ||
                    line.includes("keep-alive");
                  const isClient =
                    line.includes("sseClients") || line.includes("close");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isHeader
                            ? "#5B8DEF"
                            : isClient
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

          {/* broadcast */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(broadcastProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(broadcastProg, [0, 1], [20, 0])}px)`,
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
              broadcast -- 广播给所有客户端
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 24px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {BROADCAST_CODE.split("\n").map((line, i) => {
                  const isSet =
                    line.includes("sseClients") || line.includes("write");
                  const isPayload = line.includes("payload") || line.includes("JSON");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isSet
                            ? "#6DC5A1"
                            : isPayload
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

            {/* Flow diagram */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 24,
                opacity: interpolate(flowProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(flowProg, [0, 1], [16, 0])}px)`,
              }}
            >
              {["connect", "add to Set", "on close", "delete from Set"].map(
                (step, i) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {i > 0 && (
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 24,
                          color: COLORS.subtle,
                        }}
                      >
                        {"\u2192"}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 17,
                        color: COLORS.text,
                        padding: "10px 18px",
                        borderRadius: 10,
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: COLORS.cardShadow,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {step}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3 — Chat endpoint                                           */
/* ------------------------------------------------------------------ */
const CHAT_CODE = `// POST /api/chat
if (url.pathname === '/api/chat'
    && req.method === 'POST') {
  const chunks: Buffer[] = [];
  req.on('data', c => chunks.push(c));
  req.on('end', async () => {
    const { text } = JSON.parse(
      Buffer.concat(chunks).toString()
    );
    if (!text?.trim()) {
      res.writeHead(400);
      res.end('{"error":"empty"}');
      return;
    }

    broadcast({ type: 'typing', isTyping: true });
    const reply = await loop.push(
      createEvent('message', 'http', {
        text: text.trim()
      })
    );
    broadcast({ type: 'typing', isTyping: false });
    broadcast({ type: 'assistant', text: reply });

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({ ok: true, reply }));
  });
  return;
}`;

const chatFlow = [
  { label: "Parse JSON", detail: "Buffer.concat \u2192 JSON.parse" },
  { label: "broadcast typing", detail: "{ type: 'typing', isTyping: true }" },
  { label: "loop.push(event)", detail: "await LLM reply" },
  { label: "broadcast reply", detail: "{ type: 'assistant', text: reply }" },
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
          gap: 22,
          paddingTop: 50,
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
          Chat 端点
          <span
            style={{
              fontFamily: MONO,
              fontSize: 26,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            POST /api/chat
          </span>
        </div>

        {/* Two-column: code + flow */}
        <div
          style={{
            display: "flex",
            gap: 28,
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
              /api/chat -- 完整处理流程
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 22px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight loop.push line */}
              <div
                style={{
                  position: "absolute",
                  top: 252,
                  left: 0,
                  right: 0,
                  height: 72,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {CHAT_CODE.split("\n").map((line, i) => {
                  const isBroadcast = line.includes("broadcast");
                  const isLoop =
                    line.includes("loop.push") || line.includes("createEvent");
                  const isError =
                    line.includes("400") || line.includes("error");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isLoop
                            ? "#5B8DEF"
                            : isBroadcast
                              ? "#6DC5A1"
                              : isError
                                ? "#E8A838"
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

          {/* Flow cards */}
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
              处理流水线
            </div>
            {chatFlow.map((step, i) => {
              const delay = 40 + i * 10;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={step.label}
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
                      color: COLORS.accent,
                      width: 40,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
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
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 14,
                        color: COLORS.muted,
                        marginTop: 4,
                      }}
                    >
                      {step.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 4 — setup / teardown lifecycle                              */
/* ------------------------------------------------------------------ */
const SETUP_CODE = `setup: async (ctx: AgenticContext) => {
  loop = ctx.eventLoop;

  server = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods',
      'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers',
      'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204); res.end(); return;
    }
    // ... route handlers
  });

  await new Promise<void>(
    resolve => server!.listen(port, resolve)
  );
},`;

const TEARDOWN_CODE = `teardown: async () => {
  for (const c of sseClients) c.end();
  sseClients.clear();
  server?.close();
},

info: () => ({
  port,
  sseClients: sseClients.size,
}),`;

const SceneLifecycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const setupProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const teardownProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.8 } });
  const summaryProg = spring({ frame: frame - 65, fps, config: { damping: 12 } });

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
          paddingTop: 50,
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
          生命周期管理
        </div>

        {/* Two code blocks */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "90%",
            maxWidth: 1500,
            alignItems: "flex-start",
          }}
        >
          {/* setup */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(setupProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(setupProg, [0, 1], [-20, 0])}px)`,
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
              setup -- 创建 Server + 监听端口
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
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {SETUP_CODE.split("\n").map((line, i) => {
                  const isCors =
                    line.includes("Access-Control") || line.includes("setHeader");
                  const isServer =
                    line.includes("createServer") || line.includes("listen");
                  const isCtx =
                    line.includes("ctx.eventLoop") || line.includes("AgenticContext");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isServer
                            ? "#5B8DEF"
                            : isCors
                              ? "#E8A838"
                              : isCtx
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

          {/* teardown */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(teardownProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(teardownProg, [0, 1], [20, 0])}px)`,
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
              teardown -- 关闭 SSE + Server
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
                  lineHeight: 1.55,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {TEARDOWN_CODE.split("\n").map((line, i) => {
                  const isCleanup =
                    line.includes(".end()") ||
                    line.includes(".clear()") ||
                    line.includes(".close()");
                  const isInfo =
                    line.includes("info") || line.includes("sseClients.size");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isCleanup
                            ? "#E05252"
                            : isInfo
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

            {/* Summary */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginTop: 24,
                opacity: interpolate(summaryProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(summaryProg, [0, 1], [16, 0])}px)`,
              }}
            >
              {[
                { label: "setup", desc: "createServer \u2192 listen(port)" },
                { label: "teardown", desc: "end SSE \u2192 clear Set \u2192 close Server" },
                { label: "info", desc: "port + sseClients.size" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    boxShadow: COLORS.cardShadow,
                    padding: "10px 18px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.accent,
                      minWidth: 100,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 16,
                      color: COLORS.muted,
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              ))}
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
const SCENE_COMPS = [SceneOverview, SceneSse, SceneChat, SceneLifecycle];

const Scene: React.FC<{
  children: React.ReactNode;
  dur: number;
  isLast?: boolean;
}> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const WkChHttp: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Audio
        src={staticFile("audio/wk-ch-http/wk-ch-http.mp3")}
        volume={0.9}
      />
      {SCENES.map((s, i) => {
        const isLast = i === SCENES.length - 1;
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
};
