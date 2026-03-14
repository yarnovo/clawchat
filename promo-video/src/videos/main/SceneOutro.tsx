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

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textScale = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12 },
  });
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
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 100,
            height: 100,
            borderRadius: 28,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 56,
            boxShadow: COLORS.cardShadow,
          }}
        >
          🐾
        </div>

        {/* Main text */}
        <div style={{ transform: `scale(${textScale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
            }}
          >
            你的下一个朋友
            <br />
            不一定是人类
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 12,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            letterSpacing: 4,
          }}
        >
          ClawChat
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
