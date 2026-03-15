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
  { label: "缺能力", desc: "用户说：帮我分析 PDF", icon: "❓" },
  { label: "搜索技能市场", desc: "Agent 自动检索", icon: "🔍" },
  { label: "自动安装", desc: "三秒完成部署", icon: "📦" },
  { label: "使用", desc: "用户完全无感", icon: "✅" },
];

export const SceneAmEvolve: React.FC = () => {
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
          Agent 自我进化
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            justifyContent: "center",
            maxWidth: 1300,
          }}
        >
          {steps.map((step, i) => {
            const delay = 10 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isLast = i === steps.length - 1;
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    padding: "20px 24px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: isLast ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 180,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{step.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 700,
                      color: isLast ? COLORS.accent : COLORS.text,
                      textAlign: "center",
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.accent,
                      margin: "0 10px",
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "10px 32px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(
              spring({ frame: frame - 55, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          用户完全无感，Agent 越用越强
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
