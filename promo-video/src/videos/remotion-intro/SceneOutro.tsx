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

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
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
        {/* Logo */}
        <div style={{ transform: `scale(${logoProg})` }}>
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <polygon points="50,8 92,82 8,82" stroke={COLORS.accent} strokeWidth="3" fill="none" />
            <polygon points="50,28 72,68 28,68" stroke={COLORS.accent} strokeWidth="2" fill={`${COLORS.accent}15`} />
          </svg>
        </div>

        {/* Tagline */}
        <div style={{ transform: `scale(${textProg})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.4,
            }}
          >
            Write React.
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.accent,
              lineHeight: 1.4,
            }}
          >
            Render MP4.
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOp,
            fontFamily: MONO,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 12,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          remotion.dev
        </div>

        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          这就是 Remotion
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
