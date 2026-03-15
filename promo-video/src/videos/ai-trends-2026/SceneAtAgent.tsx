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

const shifts = [
  { before: "聊天助手", after: "工作流编排" },
  { before: "单次问答", after: "端到端执行" },
  { before: "5% 渗透率", after: "40% 渗透率" },
];

export const SceneAtAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const statProg = spring({ frame: frame - 15, fps, config: { damping: 12, mass: 0.8 } });
  const labelProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });

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
          AI Agent · 从实验到生产
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 120,
            fontWeight: 700,
            color: COLORS.accent,
            lineHeight: 1,
            transform: `scale(${statProg})`,
          }}
        >
          40%
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          企业应用将嵌入任务型 Agent — Gartner 2026
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          {shifts.map((s, i) => {
            const delay = 35 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={s.before}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, textDecoration: "line-through" }}>
                  {s.before}
                </span>
                <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.subtle }}>→</span>
                <span style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.accent }}>
                  {s.after}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
