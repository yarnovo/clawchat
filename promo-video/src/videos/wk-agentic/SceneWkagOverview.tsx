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
  {
    name: "index.ts",
    lines: 9,
    role: "Re-export",
    desc: "导出接口 + Runner + EventLoop",
    color: COLORS.subtle,
  },
  {
    name: "interfaces.ts",
    lines: 49,
    role: "接口定义",
    desc: "Channel / Extension / AgenticContext",
    color: COLORS.accent,
  },
  {
    name: "runner.ts",
    lines: 126,
    role: "核心引擎",
    desc: "AgentRunner 串联一切",
    color: COLORS.accent,
  },
];

export const SceneWkagOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 100,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -3,
            transform: `scale(${titleProg})`,
          }}
        >
          @agentkit/agentic
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
          3 files &middot; Channel + Extension + AgentRunner
        </div>

        {/* File cards */}
        <div style={{ display: "flex", gap: 28, marginTop: 12 }}>
          {files.map((f, i) => {
            const delay = 22 + i * 10;
            const cardProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={f.name}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 32px",
                  width: 340,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [24, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: f.color,
                  }}
                >
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    color: COLORS.muted,
                  }}
                >
                  {f.lines} lines
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 20,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {f.role}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    color: COLORS.muted,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
