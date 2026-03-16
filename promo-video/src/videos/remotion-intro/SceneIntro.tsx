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

  const logoProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  // Typewriter for "Remotion"
  const text = "Remotion";
  const charsVisible = Math.min(Math.floor((frame - 15) / 3), text.length);
  const displayText = frame >= 15 ? text.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < text.length;

  const subOp = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeOp = interpolate(frame, [75, 90], [0, 1], {
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
        {/* Logo triangle */}
        <div
          style={{
            transform: `scale(${logoProg})`,
            width: 120,
            height: 120,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <polygon points="50,8 92,82 8,82" stroke={COLORS.accent} strokeWidth="3" fill="none" />
            <polygon points="50,28 72,68 28,68" stroke={COLORS.accent} strokeWidth="2" fill={`${COLORS.accent}15`} />
          </svg>
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
            opacity: subOp,
            transform: `translateY(${subY}px)`,
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
          }}
        >
          用 React 写代码，输出 MP4 视频
        </div>

        {/* Badge */}
        <div
          style={{
            opacity: badgeOp,
            display: "flex",
            gap: 16,
          }}
        >
          {["React", "TypeScript", "FFmpeg"].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 22,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
