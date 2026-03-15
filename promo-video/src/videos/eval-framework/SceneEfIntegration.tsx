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

const flowSteps = [
  { label: "TS Agent", desc: "agent-core", color: "#7B8EC4" },
  { label: "JSON Trace", desc: "输出调用记录", color: COLORS.accent },
  { label: "Python", desc: "DeepEval 评估", color: "#5A9E6F" },
];

const benefits = [
  "评估逻辑与被评估系统解耦",
  "像 pytest 一样写测试",
  "CI 里自动跑",
];

export const SceneEfIntegration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.7 } });
  const benefitsProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          TypeScript + DeepEval 集成
        </div>

        {/* Flow diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {flowSteps.map((step, i) => {
            const delay = 16 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isLast = i === flowSteps.length - 1;
            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    padding: "28px 40px",
                    borderRadius: 18,
                    background: COLORS.card,
                    border: `2px solid ${step.color}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 220,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: step.color,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 36,
                      color: COLORS.subtle,
                      margin: "0 20px",
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Benefits */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(benefitsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(benefitsProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {benefits.map((b, i) => {
            const delay = 55 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={b}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  padding: "12px 24px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                {b}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
