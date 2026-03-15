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

const steps = [
  { cmd: "docker rm container", note: "容器没了", icon: "🗑️" },
  { cmd: "docker volume ls", note: "Volume 还在，占磁盘", icon: "💾" },
];

export const SceneSvPit3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const solutionProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          坑 3：孤儿 Volume
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {steps.map((step, i) => {
            const cardProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={step.cmd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  padding: "18px 32px",
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 36, flexShrink: 0 }}>{step.icon}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {step.cmd}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {step.note}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Solution */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "rgba(80,180,80,0.06)",
            borderRadius: 12,
            border: "1px solid rgba(80,180,80,0.3)",
            padding: "18px 32px",
            opacity: interpolate(solutionProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(solutionProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 32, flexShrink: 0 }}>💡</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              docker volume prune
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.muted,
              }}
            >
              定期清理，或用标签管理
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
