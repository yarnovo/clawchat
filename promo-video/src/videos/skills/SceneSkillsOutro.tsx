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

export const SceneSkillsOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textScale = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const ctaOp = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.8]);

  // Floating skill icons around the logo
  const floatingIcons = ["🔍", "💻", "📊", "🌐", "📧", "🔧"];

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
          paddingBottom: 120,
        }}
      >
        {/* Logo with floating skill icons */}
        <div style={{ position: "relative" }}>
          {floatingIcons.map((icon, i) => {
            const angle = (i / floatingIcons.length) * Math.PI * 2 + frame * 0.02;
            const radius = 70 + Math.sin(frame * 0.03 + i) * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 50 + x - 14,
                  top: 50 + y - 14,
                  fontSize: 18,
                  opacity: 0.5 + Math.sin(frame * 0.05 + i) * 0.3,
                }}
              >
                {icon}
              </div>
            );
          })}
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
        </div>

        {/* Main text */}
        <div style={{ transform: `scale(${textScale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 52,
              fontWeight: 800,
              lineHeight: 1.4,
              background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 40%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: `drop-shadow(0 0 30px rgba(108,99,255,${glow * 0.4}))`,
            }}
          >
            给你的 Agent
            <br />
            装上超能力
          </div>
        </div>

        {/* CTA */}
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
