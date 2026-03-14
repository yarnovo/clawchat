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

export const SceneSkillsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

  // Orbiting skill icons
  const skillIcons = ["🔍", "🔧", "📊", "🌐", "📝", "🔒"];

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1a1040", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 120,
        }}
      >
        {/* Central Agent icon with orbiting skills */}
        <div style={{ position: "relative", width: 200, height: 200 }}>
          {/* Orbiting skill icons */}
          {skillIcons.map((icon, i) => {
            const angle = (i / skillIcons.length) * Math.PI * 2 + frame * 0.015;
            const radius = 85;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const orbitEnt = spring({
              frame: frame - 5 - i * 4,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 100 + x - 20,
                  top: 100 + y - 20,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(108,99,255,0.1)",
                  border: "1px solid rgba(108,99,255,0.2)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 20,
                  opacity: interpolate(orbitEnt, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(orbitEnt, [0, 1], [0.5, 1])})`,
                }}
              >
                {icon}
              </div>
            );
          })}

          {/* Center Agent */}
          <div
            style={{
              position: "absolute",
              left: 100 - 50,
              top: 100 - 50,
              transform: `scale(${iconScale})`,
              width: 100,
              height: 100,
              borderRadius: 28,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 52,
              boxShadow: `0 20px 60px rgba(108,99,255,${glow}), 0 0 80px rgba(7,193,96,${glow * 0.3})`,
            }}
          >
            🐾
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 800,
            opacity: interpolate(textProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(textProg, [0, 1], [30, 0])}px)`,
            background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginTop: 16,
          }}
        >
          技能市场
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 300,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: 6,
          }}
        >
          给你的 Agent 装上超能力
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
