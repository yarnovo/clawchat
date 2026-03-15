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

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flameScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textProg = spring({ frame: frame - 8, fps, config: { damping: 12 } });
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
        {/* Flame */}
        <div style={{ transform: `scale(${flameScale})`, fontSize: 80, lineHeight: 1 }}>
          🔥
        </div>

        {/* Main text */}
        <div style={{ transform: `scale(${textProg})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
            }}
          >
            点燃 Web 生态
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: ctaOp,
            fontFamily: MONO,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 12,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          hono.dev
        </div>

        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 4,
          }}
        >
          从边缘到云端，Hono 是 2026 的答案
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
