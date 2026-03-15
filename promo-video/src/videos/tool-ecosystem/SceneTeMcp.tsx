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

const runtimes = [
  { name: "IronClaw", method: "原生 MCP 客户端" },
  { name: "OpenClaw", method: "扩展接入" },
  { name: "NanoClaw", method: "Skills 集成" },
];

export const SceneTeMcp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const mcpProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          MCP 协议 · 互操作桥梁
        </div>

        {/* Central MCP hub */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 40,
            fontWeight: 700,
            color: COLORS.accent,
            padding: "18px 48px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(mcpProg, [0, 1], [0, 1]),
            transform: `scale(${mcpProg})`,
          }}
        >
          MCP Protocol
        </div>

        {/* Connection lines + runtime cards */}
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "flex-start",
          }}
        >
          {runtimes.map((r, i) => {
            const delay = 30 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Connector line */}
                <div
                  style={{
                    width: 2,
                    height: 40,
                    background: COLORS.border,
                  }}
                />
                <div
                  style={{
                    width: 300,
                    padding: "24px 28px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 30,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {r.name}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      color: COLORS.muted,
                      textAlign: "center",
                    }}
                  >
                    {r.method}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            marginTop: 4,
            opacity: interpolate(
              spring({ frame: frame - 70, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
          }}
        >
          工具跨 Runtime 复用，不用重复实现
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
