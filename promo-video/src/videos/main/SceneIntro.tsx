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

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const ringScale = spring({
    frame: frame - 3,
    fps,
    config: { damping: 18, mass: 1.2 },
  });

  // Typewriter
  const text = "ClawChat";
  const charsVisible = Math.min(Math.floor((frame - 15) / 3), text.length);
  const displayText =
    frame >= 15 ? text.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < text.length;

  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
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
          gap: 24,
          paddingBottom: 140,
        }}
      >
        {/* Logo with subtle ring */}
        <div style={{ position: "relative" }}>
          {/* Outer ring */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: 56,
              border: `1px solid ${COLORS.border}`,
              transform: `scale(${ringScale})`,
            }}
          />
          <div
            style={{
              transform: `scale(${logoScale})`,
              width: 140,
              height: 140,
              borderRadius: 36,
              background: COLORS.card,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 84,
              boxShadow: COLORS.cardShadow,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            🐾
          </div>
        </div>

        {/* App name */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -2,
            marginTop: 20,
            color: COLORS.text,
          }}
        >
          {displayText}
          {cursorOn && (
            <span style={{ color: COLORS.accent }}>|</span>
          )}
        </div>

        {/* Slogan */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 8,
          }}
        >
          不只是聊天，是创造朋友
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
