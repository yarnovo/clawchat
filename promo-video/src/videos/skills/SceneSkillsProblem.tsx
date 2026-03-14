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

const agents = [
  { name: "法律顾问", prompt: "你是一个法律顾问..." },
  { name: "翻译助手", prompt: "你是一个翻译助手..." },
  { name: "写作帮手", prompt: "你是一个写作帮手..." },
  { name: "代码专家", prompt: "你是一个代码专家..." },
];

export const SceneSkillsProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-30, 0]);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 60,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          换个提示词{" "}
          <span style={{ fontWeight: 700, color: COLORS.accent }}>≠</span>{" "}
          新 Agent
        </div>

        {/* Agent cards */}
        <div style={{ display: "flex", gap: 32 }}>
          {agents.map((a, i) => {
            const delay = 15 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });

            return (
              <div
                key={a.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 32px",
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  width: 240,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                    letterSpacing: 2,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    color: COLORS.muted,
                    textAlign: "center",
                    padding: "10px 16px",
                    border: `1px dashed ${COLORS.border}`,
                    borderRadius: 8,
                    width: "100%",
                  }}
                >
                  {a.prompt}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.subtle,
                    padding: "8px 16px",
                    border: `1px dashed ${COLORS.border}`,
                    borderRadius: 8,
                    width: "100%",
                    textAlign: "center",
                    letterSpacing: 2,
                  }}
                >
                  暂无技能
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tagline */}
        {frame > 60 && (
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 400,
              color: COLORS.muted,
              letterSpacing: 3,
              opacity: interpolate(frame, [60, 80], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            能力完全一样，只是名字不同
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
