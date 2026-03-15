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

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const ringScale = spring({ frame: frame - 3, fps, config: { damping: 18, mass: 1.2 } });

  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const titleY = interpolate(titleProg, [0, 1], [30, 0]);

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
          gap: 28,
          paddingBottom: 140,
        }}
      >
        {/* Icon with ring */}
        <div style={{ position: "relative" }}>
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
              transform: `scale(${iconScale})`,
              width: 140,
              height: 140,
              borderRadius: 36,
              background: COLORS.card,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 80,
              boxShadow: COLORS.cardShadow,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
              <line x1="9" y1="11" x2="15" y2="11" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            letterSpacing: -1,
          }}
        >
          法律合同审查助手
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT_SANS,
            fontSize: 34,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 6,
          }}
        >
          AI 守护每一份合同
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
