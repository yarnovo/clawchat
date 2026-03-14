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

export const SceneBackupCover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [15, 35], [30, 0], {
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
  const metaOpacity = interpolate(frame, [55, 75], [0, 1], {
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
        {/* Shield icon */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 120,
            height: 120,
            borderRadius: 32,
            background: "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 64,
            boxShadow: COLORS.cardShadow,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          🛡️
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            letterSpacing: 2,
          }}
        >
          数据备份方案
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
          }}
        >
          ClawChat 内部技术分享
        </div>

        {/* Date */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.subtle,
            opacity: metaOpacity,
            marginTop: 12,
          }}
        >
          2026.03
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
