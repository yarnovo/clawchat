import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const steps = [
  { icon: "⚠️", text: "备份 ≠ 能恢复" },
  { icon: "🔄", text: "必须做端到端恢复演练" },
  { icon: "✅", text: "新容器 → 挂载备份 → 验证数据" },
];

export const SceneSvPit4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
          坑 4：备份不验证
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {steps.map((step, i) => {
            const stepProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={step.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 36px",
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(stepProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 36, flexShrink: 0 }}>{step.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    color: COLORS.text,
                  }}
                >
                  {step.text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
