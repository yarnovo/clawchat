import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const codeLines = [
  { text: "function myChannel(): Channel {", color: COLORS.text },
  { text: "  return {", color: COLORS.text },
  { text: "    name: 'websocket',", color: COLORS.text },
  { text: "    setup: async (ctx) => {", color: COLORS.text },
  { text: "      const ws = new WebSocket(url);", color: COLORS.text },
  { text: "      ws.on('message', (text) => {", color: COLORS.text },
  { text: "        ctx.eventLoop.push(", color: COLORS.accent },
  { text: "          createEvent('message', 'ws', { text })", color: COLORS.accent },
  { text: "        );", color: COLORS.accent },
  { text: "      });", color: COLORS.text },
  { text: "    },", color: COLORS.text },
  { text: "    teardown: async () => ws.close(),", color: COLORS.muted },
  { text: "  };", color: COLORS.text },
  { text: "}", color: COLORS.text },
];

export const SceneAkdgChannel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 32, paddingBottom: 140 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{
            fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>扩展点 3: Channel</div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>— setup 拿 EventLoop，push 事件</div>
        </div>

        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
          padding: "24px 40px", boxShadow: COLORS.cardShadow,
        }}>
          {codeLines.map((line, i) => {
            const prog = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 14, mass: 0.4 } });
            return (
              <div key={i} style={{
                fontFamily: MONO, fontSize: 22, lineHeight: 1.7, color: line.color, whiteSpace: "pre" as const,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
              }}>{line.text}</div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
