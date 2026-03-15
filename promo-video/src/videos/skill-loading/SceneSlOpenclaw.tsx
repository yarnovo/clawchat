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

const contextItems = [
  { name: "AGENTS.md", isSkill: false },
  { name: "SOUL.md", isSkill: false },
  { name: "skill-search.md", isSkill: true },
  { name: "skill-translate.md", isSkill: true },
  { name: "IDENTITY.md", isSkill: false },
];

export const SceneSlOpenclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          OpenClaw
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 4,
          }}
        >
          ClawHub → context files → system prompt
        </div>

        {/* Flow diagram: ClawHub -> download -> Project Context */}
        <div
          style={{
            display: "flex",
            gap: 40,
            alignItems: "flex-start",
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {/* ClawHub source */}
          <div
            style={{
              padding: "18px 28px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
              ClawHub
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
              技能注册表
            </div>
          </div>

          <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle, alignSelf: "center" }}>
            →
          </div>

          {/* Project Context block */}
          <div
            style={{
              padding: "20px 28px",
              borderRadius: 14,
              background: `linear-gradient(135deg, rgba(218, 119, 86, 0.05), rgba(218, 119, 86, 0.12))`,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 360,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 6,
              }}
            >
              # Project Context
            </div>
            {contextItems.map((item, i) => {
              const delay = 28 + i * 6;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={item.name}
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: item.isSkill ? 600 : 400,
                    color: item.isSkill ? COLORS.accent : COLORS.text,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: item.isSkill ? "rgba(218, 119, 86, 0.08)" : "transparent",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                  }}
                >
                  {item.name}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            marginTop: 8,
            padding: "8px 24px",
            borderRadius: 8,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          统一加载，不区分通道
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
