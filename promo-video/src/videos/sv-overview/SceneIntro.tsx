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

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  // Title typewriter
  const text = "ClawChat Server";
  const charsVisible = Math.min(Math.floor((frame - 10) / 3), text.length);
  const displayText = frame >= 10 ? text.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < text.length;

  // Subtitle fade
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [50, 70], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tags
  const tags = ["市场", "代理", "计费"];

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
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            fontSize: 90,
            lineHeight: 1,
          }}
        >
          🖥️
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: -2,
            color: COLORS.text,
            whiteSpace: "pre",
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
            display: "flex",
            gap: 20,
          }}
        >
          {tags.map((tag, i) => {
            const tagDelay = 50 + i * 8;
            const tagEnt = spring({
              frame: frame - tagDelay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={tag}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 36,
                  fontWeight: 500,
                  color: COLORS.accent,
                  padding: "10px 32px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.card,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(tagEnt, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagEnt, [0, 1], [0.8, 1])})`,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>

        {/* Description */}
        <div
          style={{
            opacity: interpolate(frame, [75, 95], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT,
            fontSize: 28,
            color: COLORS.muted,
            maxWidth: 800,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          连接前端和 Agent 容器的中间层
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
