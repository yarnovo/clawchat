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

const STEPS = [
  { label: "用户增长", icon: "👥" },
  { label: "Agent 供给增加", icon: "🤖" },
  { label: "更多选择", icon: "🎯" },
  { label: "更多用户", icon: "📈" },
];

export const SceneBizFlywheel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const cx = 640;
  const cy = 360;
  const radius = 180;

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          正向飞轮
        </div>

        <div
          style={{
            position: "relative",
            width: radius * 2 + 240,
            height: radius * 2 + 140,
          }}
        >
          {STEPS.map((step, i) => {
            const stepProg = spring({
              frame: frame - 12 - i * 8,
              fps,
              config: { damping: 12, mass: 0.8 },
            });

            const angle = (i * Math.PI * 2) / STEPS.length - Math.PI / 2;
            const x = cx - cx + radius * 1.2 + radius * Math.cos(angle);
            const y = cy - cy + radius * 0.8 + radius * Math.sin(angle);

            return (
              <div
                key={step.label}
                style={{
                  position: "absolute",
                  left: x - 60,
                  top: y - 30,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(stepProg, [0, 1], [0.6, 1])})`,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 32,
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </div>
              </div>
            );
          })}

          {STEPS.map((_, i) => {
            const arrowProg = spring({
              frame: frame - 20 - i * 8,
              fps,
              config: { damping: 14 },
            });

            const angle1 = (i * Math.PI * 2) / STEPS.length - Math.PI / 2;
            const angle2 = (((i + 1) % STEPS.length) * Math.PI * 2) / STEPS.length - Math.PI / 2;

            const midAngle = (angle1 + angle2) / 2;
            const arrowX = cx - cx + radius * 1.2 + (radius * 0.65) * Math.cos(midAngle);
            const arrowY = cy - cy + radius * 0.8 + (radius * 0.65) * Math.sin(midAngle);
            const rotation = (midAngle * 180) / Math.PI + 90;

            return (
              <div
                key={`arrow-${i}`}
                style={{
                  position: "absolute",
                  left: arrowX - 12,
                  top: arrowY - 12,
                  fontSize: 24,
                  color: COLORS.accent,
                  transform: `rotate(${rotation}deg)`,
                  opacity: interpolate(arrowProg, [0, 1], [0, 1]),
                }}
              >
                ▸
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
