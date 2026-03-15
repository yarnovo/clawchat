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

const comparisons = [
  { label: "审查耗时", human: "30 min", ai: "2 min", unit: "/ 份" },
  { label: "审查准确率", human: "85%", ai: "94%", unit: "" },
  { label: "遗漏风险条款", human: "15%", ai: "< 3%", unit: "" },
  { label: "法条引用", human: "凭记忆", ai: "自动匹配", unit: "" },
];

export const SceneStats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          AI vs 人工审查
        </div>

        {/* Comparison table */}
        <div
          style={{
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          {(() => {
            const headerEnt = spring({ frame: frame - 8, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                style={{
                  display: "flex",
                  borderBottom: `2px solid ${COLORS.border}`,
                  opacity: interpolate(headerEnt, [0, 1], [0, 1]),
                }}
              >
                <div style={{ width: 220, padding: "18px 28px", fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.text, borderRight: `1px solid ${COLORS.border}` }} />
                <div style={{ width: 260, padding: "18px 28px", fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.muted, borderRight: `1px solid ${COLORS.border}`, textAlign: "center" }}>
                  人工审查
                </div>
                <div style={{ width: 260, padding: "18px 28px", fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.accent, textAlign: "center" }}>
                  AI 审查
                </div>
              </div>
            );
          })()}

          {/* Rows */}
          {comparisons.map((c, i) => {
            const delay = 15 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={c.label}
                style={{
                  display: "flex",
                  borderBottom: i < comparisons.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [10, 0])}px)`,
                }}
              >
                <div style={{ width: 220, padding: "16px 28px", fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.text, borderRight: `1px solid ${COLORS.border}` }}>
                  {c.label}
                </div>
                <div style={{ width: 260, padding: "16px 28px", fontFamily: MONO, fontSize: 28, color: COLORS.muted, textAlign: "center", borderRight: `1px solid ${COLORS.border}` }}>
                  {c.human}{c.unit}
                </div>
                <div style={{ width: 260, padding: "16px 28px", fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent, textAlign: "center" }}>
                  {c.ai}{c.unit}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
