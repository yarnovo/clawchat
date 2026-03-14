import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT } from "../../constants";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textScale = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const ctaOp = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.8]);

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
          paddingBottom: 120,
        }}
      >
        {/* Logo with pulsing glow */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            width: 100,
            height: 100,
            borderRadius: 28,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 52,
            boxShadow: `0 20px 80px rgba(108,99,255,${glow}), 0 0 120px rgba(7,193,96,${glow * 0.3})`,
          }}
        >
          🐾
        </div>

        {/* Main text — gradient */}
        <div style={{ transform: `scale(${textScale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.4,
              background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 40%, #07C160 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 30px rgba(108,99,255,${glow * 0.4}))`,
            }}
          >
            你的下一个朋友
            <br />
            不一定是人类
          </div>
        </div>

        {/* CTA with animated border */}
        <div
          style={{
            opacity: ctaOp,
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 16,
            background: "rgba(7,193,96,0.06)",
            border: `1px solid rgba(7,193,96,${interpolate(Math.sin(frame * 0.08), [-1, 1], [0.2, 0.5])})`,
            boxShadow: `0 0 30px rgba(7,193,96,${interpolate(Math.sin(frame * 0.08), [-1, 1], [0.05, 0.15])})`,
            letterSpacing: 4,
          }}
        >
          ClawChat
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
