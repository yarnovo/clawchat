import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { COLORS, FONT } from "./constants";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const ringScale = spring({ frame: frame - 3, fps, config: { damping: 18, mass: 1.2 } });

  // Typewriter
  const text = "ClawChat";
  const charsVisible = Math.min(Math.floor((frame - 15) / 3), text.length);
  const displayText = frame >= 15 ? text.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < text.length;

  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

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
          paddingBottom: 120,
        }}
      >
        {/* Logo with glowing ring */}
        <div style={{ position: "relative" }}>
          {/* Outer glow ring */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: 56,
              border: `2px solid rgba(108,99,255,${glow * 0.5})`,
              boxShadow: `0 0 40px rgba(108,99,255,${glow * 0.3}), inset 0 0 40px rgba(108,99,255,${glow * 0.1})`,
              transform: `scale(${ringScale})`,
            }}
          />
          <div
            style={{
              transform: `scale(${logoScale})`,
              width: 140,
              height: 140,
              borderRadius: 36,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 72,
              boxShadow: `0 20px 80px rgba(108,99,255,${glow}), 0 0 120px rgba(7,193,96,${glow * 0.3})`,
            }}
          >
            🐾
          </div>
        </div>

        {/* App name — gradient text */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: -2,
            marginTop: 20,
            background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #07C160 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {displayText}
          {cursorOn && (
            <span style={{ WebkitTextFillColor: COLORS.accent }}>|</span>
          )}
        </div>

        {/* Slogan */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 300,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 8,
          }}
        >
          不只是聊天，是创造朋友
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
