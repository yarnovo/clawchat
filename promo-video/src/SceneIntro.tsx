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

  // Typewriter effect
  const text = "Remotion Demo";
  const charsVisible = Math.min(Math.floor((frame - 15) / 3), text.length);
  const displayText = frame >= 15 ? text.slice(0, Math.max(0, charsVisible)) : "";
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
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 24 }}
      >
        {/* App icon */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 120,
            height: 120,
            borderRadius: 30,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 60,
            boxShadow: "0 20px 60px rgba(108,99,255,0.4)",
          }}
        >
          🎬
        </div>

        {/* Typewriter title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.white,
            marginTop: 16,
          }}
        >
          {displayText}
          {cursorOn && <span>|</span>}
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT,
            fontSize: 28,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 4,
          }}
        >
          React 驱动的视频创作
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
