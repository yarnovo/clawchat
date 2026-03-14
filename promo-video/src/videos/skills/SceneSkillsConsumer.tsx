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

// Search results with skill tags
const agents = [
  {
    name: "法律顾问 Pro",
    avatar: "🏛️",
    skills: ["法规检索", "合同审查", "案例分析"],
  },
  {
    name: "全栈开发助手",
    avatar: "👨‍💻",
    skills: ["代码审查", "单元测试", "架构设计", "数据库优化"],
  },
  {
    name: "数据分析师",
    avatar: "📈",
    skills: ["数据可视化", "统计分析"],
  },
];

export const SceneSkillsConsumer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          会什么，一看便知
        </div>

        {/* Agent cards with skill tags */}
        <div style={{ display: "flex", gap: 28 }}>
          {agents.map((a, i) => {
            const delay = 15 + i * 18;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={a.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: "28px 24px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 320,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                }}
              >
                {/* Agent header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontSize: 28,
                    }}
                  >
                    {a.avatar}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: FONT,
                        fontSize: 26,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 26,
                        color: COLORS.muted,
                      }}
                    >
                      {a.skills.length} 个技能
                    </div>
                  </div>
                </div>

                {/* Skill tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {a.skills.map((skill, si) => {
                    const tagDelay = delay + 30 + si * 8;
                    const tagEnt = spring({
                      frame: frame - tagDelay,
                      fps,
                      config: { damping: 14, mass: 0.5 },
                    });

                    return (
                      <div
                        key={skill}
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 26,
                          fontWeight: 500,
                          color: COLORS.accent,
                          padding: "5px 12px",
                          borderRadius: 8,
                          background: "rgba(218,119,86,0.08)",
                          border: "1px solid rgba(218,119,86,0.15)",
                          opacity: interpolate(tagEnt, [0, 1], [0, 1]),
                          transform: `scale(${interpolate(tagEnt, [0, 1], [0.7, 1])})`,
                        }}
                      >
                        {skill}
                      </div>
                    );
                  })}
                </div>

                {/* Add friend button */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.card,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: COLORS.accent,
                    textAlign: "center",
                  }}
                >
                  加好友
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
