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

export const SceneBackupOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const textOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [20, 40], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subY = interpolate(frame, [40, 60], [20, 0], {
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
        {/* Shield icon */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 130,
            height: 130,
            borderRadius: 36,
            background: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 72,
            boxShadow: COLORS.cardShadow,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          🛡️
        </div>

        {/* Main text */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 68,
            fontWeight: 700,
            color: COLORS.text,
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          数据安全，从备份开始
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
          }}
        >
          ClawChat Backup Strategy
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
