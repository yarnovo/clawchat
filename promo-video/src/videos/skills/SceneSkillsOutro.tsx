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

export const SceneSkillsOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textScale = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const ctaOp = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Floating skill labels around the logo
  const floatingLabels = ["搜索", "代码", "分析", "网络", "邮件", "工具"];

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
        {/* Logo with floating skill labels */}
        <div style={{ position: "relative" }}>
          {floatingLabels.map((label, i) => {
            const angle = (i / floatingLabels.length) * Math.PI * 2 + frame * 0.02;
            const radius = 70 + Math.sin(frame * 0.03 + i) * 10;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 50 + x - 20,
                  top: 50 + y - 12,
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: 0.5 + Math.sin(frame * 0.05 + i) * 0.3,
                }}
              >
                {label}
              </div>
            );
          })}
          <div
            style={{
              transform: `scale(${logoScale})`,
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

        {/* Main text */}
        <div style={{ transform: `scale(${textScale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
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
            fontSize: 36,
            fontWeight: 700,
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
