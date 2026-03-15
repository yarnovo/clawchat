import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

const QUEUE_ITEM_CODE = `interface QueueItem {
  event: AgentEvent;
  resolve: (result: string) => void;
  reject: (err: Error) => void;
}`;

const PUSH_CODE = `push(event: AgentEvent): Promise<string> {
  return new Promise((resolve, reject) => {
    this.queue.push({ event, resolve, reject });
    // strategy routing...
    this.drain();
  });
}`;

const DRAIN_CODE = `private async drain(): Promise<void> {
  if (this.processing || !this.running
      || this.queue.length === 0) return;
  this.processing = true;
  // batch: splice all; else: shift one
  await this.processItems(items);
  this.processing = false;
  if (this.queue.length > 0) this.drain();
}`;

const METHODS = [
  { name: "push(event)", desc: "Promise<string>" },
  { name: "fire(event)", desc: "void (fire-and-forget)" },
  { name: "on(type, fn)", desc: "subscribe" },
  { name: "emit(event)", desc: "broadcast + wildcard *" },
];

export const SceneWkelClass: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const queueProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const pushProg = spring({ frame: frame - 28, fps, config: { damping: 14, mass: 0.8 } });
  const drainProg = spring({ frame: frame - 44, fps, config: { damping: 14, mass: 0.8 } });
  const methodsProg = spring({ frame: frame - 60, fps, config: { damping: 12 } });

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
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          EventLoop Class
        </div>

        {/* Three code blocks in a row */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* QueueItem */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(queueProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(queueProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              QueueItem
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {QUEUE_ITEM_CODE.split("\n").map((line, i) => {
                const isResolve = line.includes("resolve") || line.includes("reject");
                return (
                  <div key={i}>
                    <span style={{ color: isResolve ? "#5B8DEF" : COLORS.text }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* push() */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(pushProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(pushProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              push()
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {PUSH_CODE.split("\n").map((line, i) => {
                const isDrain = line.includes("drain");
                const isPromise = line.includes("Promise");
                return (
                  <div key={i}>
                    <span style={{ color: isDrain ? "#6DC5A1" : isPromise ? "#5B8DEF" : COLORS.text }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* drain() */}
          <div
            style={{
              padding: "16px 20px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(drainProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(drainProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              drain()
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.6,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {DRAIN_CODE.split("\n").map((line, i) => {
                const isGuard = line.includes("if (this.processing");
                const isRecurse = line.includes("this.drain()");
                return (
                  <div key={i}>
                    <span style={{ color: isRecurse ? "#6DC5A1" : isGuard ? "#E8A838" : COLORS.text }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Method row */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 8,
            opacity: interpolate(methodsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(methodsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {METHODS.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 12,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.text,
                  whiteSpace: "pre",
                }}
              >
                {m.name}
              </span>
              <span
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  color: COLORS.muted,
                }}
              >
                {m.desc}
              </span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
