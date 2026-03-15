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

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  const badgeOp = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        {/* Icon */}
        <div
          style={{
            transform: `scale(${titleProg})`,
            width: 120,
            height: 120,
            borderRadius: 32,
            background: COLORS.card,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: COLORS.cardShadow,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          实战案例
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [15, 0])}px)`,
            letterSpacing: 4,
          }}
        >
          AI 如何审查真实合同条款
        </div>

        {/* Badge */}
        <div
          style={{
            opacity: badgeOp,
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.accent,
            padding: "10px 28px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            boxShadow: COLORS.cardShadow,
          }}
        >
          4 个高频风险场景
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
