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

export const SceneSkillsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orbiting skill labels
  const skillLabels = ["搜索", "工具", "分析", "网络", "写作", "安全"];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        {/* Central Agent icon with orbiting skills */}
        <div style={{ position: "relative", width: 200, height: 200 }}>
          {/* Orbiting skill labels */}
          {skillLabels.map((label, i) => {
            const angle = (i / skillLabels.length) * Math.PI * 2 + frame * 0.015;
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
                  left: 100 + x - 24,
                  top: 100 + y - 16,
                  padding: "4px 12px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  opacity: interpolate(orbitEnt, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(orbitEnt, [0, 1], [0.5, 1])})`,
                }}
              >
                {label}
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
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 56,
            }}
          >
            🐾
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(textProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(textProg, [0, 1], [30, 0])}px)`,
            marginTop: 16,
          }}
        >
          技能市场
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.muted,
            letterSpacing: 6,
          }}
        >
          给你的 Agent 装上超能力
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
