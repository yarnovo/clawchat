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

const recommendations = [
  { scenario: "个人多渠道", runtime: "OpenClaw" },
  { scenario: "企业安全", runtime: "IronClaw" },
  { scenario: "轻量定制", runtime: "NanoClaw" },
];

export const SceneRbOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            marginBottom: 8,
          }}
        >
          选择指南
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            marginBottom: 8,
          }}
        >
          每个 Agent 可以独立选择自己的 Runtime
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {recommendations.map((rec, i) => {
            const delay = 20 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={rec.scenario}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 220,
                    textAlign: "right",
                  }}
                >
                  {rec.scenario}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    color: COLORS.subtle,
                  }}
                >
                  →
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 36,
                    fontWeight: 700,
                    color: COLORS.accent,
                    padding: "10px 28px",
                    borderRadius: 12,
                    background: COLORS.card,
                    border: `2px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  {rec.runtime}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
