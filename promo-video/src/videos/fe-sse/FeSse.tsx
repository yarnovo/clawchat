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

import introWords from "./words/fesse-intro-words.json";
import reconnectWords from "./words/fesse-reconnect-words.json";
import flowWords from "./words/fesse-flow-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

/* ------------------------------------------------------------------ */
/*  Scene 1 — fetch + ReadableStream SSE                              */
/* ------------------------------------------------------------------ */
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const compareProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.8 } });
  const tagsProg = spring({ frame: frame - 70, fps, config: { damping: 12 } });

  const compareData = [
    { label: "EventSource", items: ["GET only", "No custom headers", "No JWT", "Auto reconnect"], bad: true },
    { label: "fetch + ReadableStream", items: ["Custom headers", "Bearer JWT", "WebView compatible", "Manual control"], bad: false },
  ];

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
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          SSE: fetch + ReadableStream
        </div>

        {/* Comparison cards */}
        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(compareProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(compareProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {compareData.map((col) => (
            <div
              key={col.label}
              style={{
                width: 480,
                padding: "24px 32px",
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${col.bad ? "#E8A838" : COLORS.accent}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  color: col.bad ? "#E8A838" : COLORS.accent,
                  marginBottom: 16,
                }}
              >
                {col.bad ? "\u2717 " : "\u2713 "}
                {col.label}
              </div>
              {col.items.map((item) => (
                <div
                  key={item}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: col.bad ? COLORS.muted : COLORS.text,
                    lineHeight: 1.8,
                    textDecoration: col.bad ? "line-through" : "none",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Code snippet */}
        <div
          style={{
            width: "85%",
            maxWidth: 1100,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
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
            sse-client.ts -- fetch SSE
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
                fontSize: 20,
                lineHeight: 1.55,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {`const res = await fetch(url, {
  signal,
  headers: { Accept: 'text/event-stream' },
});
const reader = res.body?.getReader();`
                .split("\n")
                .map((line, i) => {
                  const isFetch = line.includes("fetch") || line.includes("signal");
                  const isReader = line.includes("reader") || line.includes("getReader");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isFetch
                            ? "#5B8DEF"
                            : isReader
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

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["JWT Auth", "WebView Ready", "AbortController"].map((tag) => (
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
/*  Scene 2 — Reconnect with exponential backoff                      */
/* ------------------------------------------------------------------ */
const SceneReconnect: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const timelineProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const visProg = spring({ frame: frame - 60, fps, config: { damping: 12 } });

  const backoffSteps = [
    { delay: "1s", ms: 1000, width: 60 },
    { delay: "2s", ms: 2000, width: 120 },
    { delay: "4s", ms: 4000, width: 200 },
    { delay: "8s", ms: 8000, width: 320 },
    { delay: "16s", ms: 16000, width: 440 },
    { delay: "30s", ms: 30000, width: 500, capped: true },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingTop: 60,
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          指数退避重连
        </div>

        {/* Backoff timeline bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "80%",
            maxWidth: 1200,
            opacity: interpolate(timelineProg, [0, 1], [0, 1]),
          }}
        >
          {backoffSteps.map((step, i) => {
            const delay = 15 + i * 8;
            const barProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const barWidth = interpolate(barProg, [0, 1], [0, step.width]);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(barProg, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.text,
                    width: 100,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {step.delay}
                </div>
                <div
                  style={{
                    height: 36,
                    width: barWidth,
                    borderRadius: 8,
                    background: step.capped
                      ? `linear-gradient(90deg, ${COLORS.accent}, #E05252)`
                      : COLORS.accent,
                    opacity: 0.8,
                  }}
                />
                {step.capped && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: "#E05252",
                      fontWeight: 600,
                    }}
                  >
                    MAX_BACKOFF
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Code snippet for backoff logic */}
        <div
          style={{
            width: "80%",
            maxWidth: 1200,
            opacity: interpolate(timelineProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(timelineProg, [0, 1], [16, 0])}px)`,
          }}
        >
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "18px 24px",
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 22,
                lineHeight: 1.55,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {`backoff = Math.min(backoff * 2, MAX_BACKOFF)  // 30s`}
            </pre>
          </div>
        </div>

        {/* Visibility change */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(visProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(visProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["visibilitychange", "\u2192", "visible?", "\u2192", "reconnect()"].map(
            (step, i) => (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: i === 1 || i === 3 ? 28 : 24,
                  fontWeight: i === 4 ? 700 : 400,
                  color: i === 4 ? COLORS.accent : i === 1 || i === 3 ? COLORS.subtle : COLORS.text,
                  padding: i === 1 || i === 3 ? "0" : "10px 20px",
                  borderRadius: i === 1 || i === 3 ? 0 : 10,
                  background: i === 1 || i === 3 ? "transparent" : COLORS.card,
                  border: i === 1 || i === 3 ? "none" : `1px solid ${COLORS.border}`,
                  boxShadow: i === 1 || i === 3 ? "none" : COLORS.cardShadow,
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
/*  Scene 3 — Dual message flow                                       */
/* ------------------------------------------------------------------ */
const SceneFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const postProg = spring({ frame: frame - 15, fps, config: { damping: 14, mass: 0.8 } });
  const sseProg = spring({ frame: frame - 35, fps, config: { damping: 14, mass: 0.8 } });
  const futureProg = spring({ frame: frame - 60, fps, config: { damping: 12 } });

  const postSteps = [
    { label: "User", action: "send text" },
    { label: "POST /chat", action: "chatSend()" },
    { label: "Server", action: "LLM response" },
    { label: "Client", action: "addMessage()" },
  ];

  const sseEvents = [
    { type: "connected", desc: "reset backoff" },
    { type: "typing", desc: "show indicator" },
    { type: "assistant", desc: "add reply (future)" },
  ];

  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.4, 1, 0.4],
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          双路消息流
        </div>

        <div
          style={{
            display: "flex",
            gap: 36,
            width: "90%",
            maxWidth: 1500,
            alignItems: "flex-start",
          }}
        >
          {/* POST path */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(postProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(postProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 12,
                letterSpacing: 1,
              }}
            >
              POST -- 主路径
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {postSteps.map((step, i) => {
                const delay = 15 + i * 8;
                const prog = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {i > 0 && (
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 24,
                          color: COLORS.subtle,
                          width: 30,
                          textAlign: "center",
                        }}
                      >
                        {"\u2193"}
                      </div>
                    )}
                    {i === 0 && <div style={{ width: 30 }} />}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        boxShadow: COLORS.cardShadow,
                        padding: "14px 20px",
                        opacity: interpolate(prog, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 24,
                          fontWeight: 700,
                          color: COLORS.text,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 20,
                          color: COLORS.muted,
                        }}
                      >
                        {step.action}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SSE path */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(sseProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sseProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 600,
                color: "#5B8DEF",
                marginBottom: 12,
                letterSpacing: 1,
              }}
            >
              SSE -- 实时通道
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {sseEvents.map((evt, i) => {
                const delay = 35 + i * 10;
                const prog = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={evt.type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "14px 20px",
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#5B8DEF",
                        padding: "4px 12px",
                        borderRadius: 6,
                        background: "rgba(91,141,239,0.08)",
                      }}
                    >
                      {evt.type}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        color: COLORS.muted,
                      }}
                    >
                      {evt.desc}
                    </div>
                    {evt.type === "typing" && (
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 28,
                          color: COLORS.accent,
                          opacity: pulseOpacity,
                          marginLeft: "auto",
                        }}
                      >
                        ...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Future: requestId dedup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(futureProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(futureProg, [0, 1], [16, 0])}px)`,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: COLORS.cardShadow,
            padding: "16px 28px",
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 20,
              fontWeight: 600,
              color: COLORS.accent,
            }}
          >
            Future-proof
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              color: COLORS.text,
            }}
          >
            requestId
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 20,
              color: COLORS.muted,
            }}
          >
            POST + SSE 去重, 流式升级零改动
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Composition                                                       */
/* ------------------------------------------------------------------ */
const SCENE_COMPS = [SceneIntro, SceneReconnect, SceneFlow];
const SCENE_WORDS = [introWords, reconnectWords, flowWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  const endFrame = isLast
    ? Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD
    : Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i] };
});

export const FE_SSE_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const FeSse: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
    <Audio src={staticFile("audio/fe-sse/fe-sse.mp3")} volume={0.9} />
    {scenes.map((s, i) => {
      const isLast = i === scenes.length - 1;
      const seqDur = isLast ? s.dur : s.dur + FADE;
      const sceneStartMs = (s.from / FPS) * 1000;
      return (
        <Sequence key={i} from={s.from} durationInFrames={seqDur}>
          <Scene dur={seqDur} isLast={isLast}>
            <s.Comp />
            <AbsoluteFill style={{ zIndex: 100 }}>
              <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
            </AbsoluteFill>
          </Scene>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
