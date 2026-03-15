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

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Flame icon scale
  const flameScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  // Title typewriter
  const text = "Hono";
  const charsVisible = Math.min(Math.floor((frame - 12) / 4), text.length);
  const displayText = frame >= 12 ? text.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < text.length;

  // Subtitle fade-in
  const subOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [45, 65], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Year badge
  const badgeOpacity = interpolate(frame, [70, 85], [0, 1], {
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
          gap: 28,
          paddingBottom: 140,
        }}
      >
        {/* Flame icon */}
        <div
          style={{
            transform: `scale(${flameScale})`,
            fontSize: 100,
            lineHeight: 1,
          }}
        >
          🔥
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -2,
            color: COLORS.text,
          }}
        >
          {displayText}
          {cursorOn && <span style={{ color: COLORS.accent }}>|</span>}
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 6,
          }}
        >
          Ultrafast web framework for the Edges
        </div>

        {/* Year badge */}
        <div
          style={{
            opacity: badgeOpacity,
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "10px 32px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            boxShadow: COLORS.cardShadow,
          }}
        >
          2026 年度首选框架
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
