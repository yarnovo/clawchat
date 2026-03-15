import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const files = [
  { name: "index.ts", desc: "re-export 入口", lines: 4 },
  { name: "agent.ts", desc: "Agent 类 + while 循环", lines: 124 },
  { name: "llm.ts", desc: "LLMProvider 接口", lines: 44 },
  { name: "session.ts", desc: "ChatSession 接口", lines: 15 },
];

const exports = [
  "Agent",
  "AgentOptions",
  "LLMProvider",
  "ChatMessage",
  "ToolCall",
  "ToolDefinition",
  "ChatSession",
  "InMemorySession",
];

export const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const filesProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });
  const exportsProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 88,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -3,
            transform: `scale(${titleProg})`,
          }}
        >
          @agentkit/core
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          4 files &middot; 187 lines &middot; 0 dependencies
        </div>

        {/* File list */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 12,
            opacity: interpolate(filesProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(filesProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {files.map((f, i) => {
            const cardDelay = 22 + i * 8;
            const cardProg = spring({
              frame: frame - cardDelay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={f.name}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 180,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 16,
                    color: COLORS.muted,
                  }}
                >
                  {f.desc}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: COLORS.subtle,
                  }}
                >
                  {f.lines} lines
                </div>
              </div>
            );
          })}
        </div>

        {/* Exports row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 800,
            opacity: interpolate(exportsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(exportsProg, [0, 1], [12, 0])}px)`,
          }}
        >
          {exports.map((e, i) => {
            const tagDelay = 50 + i * 4;
            const tagProg = spring({
              frame: frame - tagDelay,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={e}
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  color: COLORS.text,
                  padding: "6px 16px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                }}
              >
                {e}
              </div>
            );
          })}
        </div>

        {/* Zero deps badge */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 22,
            color: COLORS.subtle,
            letterSpacing: 2,
            marginTop: 8,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
          }}
        >
          zero external dependencies
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
