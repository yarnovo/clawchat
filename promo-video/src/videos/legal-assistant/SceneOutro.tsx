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

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textProg = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const ctaOp = interpolate(frame, [40, 60], [0, 1], {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            width: 100,
            height: 100,
            borderRadius: 28,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: COLORS.cardShadow,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        {/* Main text */}
        <div style={{ transform: `scale(${textProg})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
            }}
          >
            合同风控
            <br />
            第一道防线
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 12,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            letterSpacing: 4,
          }}
        >
          法律合同审查助手
        </div>

        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          在 ClawChat 中添加，立即开始审查
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
