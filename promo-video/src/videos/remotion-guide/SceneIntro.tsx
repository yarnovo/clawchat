import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const badgeOp = interpolate(frame, [60, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 28, paddingBottom: 140 }}>
        <div style={{ transform: `scale(${logoProg})` }}>
          <svg width="90" height="90" viewBox="0 0 100 100" fill="none">
            <polygon points="50,8 92,82 8,82" stroke={COLORS.accent} strokeWidth="3" fill="none" />
            <polygon points="50,28 72,68 28,68" stroke={COLORS.accent} strokeWidth="2" fill={`${COLORS.accent}15`} />
          </svg>
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 72, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
        }}>
          Remotion 深度指南
        </div>
        <div style={{
          fontFamily: FONT_SANS, fontSize: 34, color: COLORS.muted, letterSpacing: 4,
          opacity: interpolate(subProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(subProg, [0, 1], [15, 0])}px)`,
        }}>
          面向开发者的实战手册
        </div>
        <div style={{ opacity: badgeOp, display: "flex", gap: 14 }}>
          {["Hooks", "动画", "时间轴", "媒体", "渲染"].map((t) => (
            <div key={t} style={{
              fontFamily: FONT_SANS, fontSize: 22, color: COLORS.accent, padding: "8px 20px",
              borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.card, boxShadow: COLORS.cardShadow,
            }}>{t}</div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
