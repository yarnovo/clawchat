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

// Search results with skill tags
const agents = [
  {
    name: "法律顾问 Pro",
    avatar: "🏛️",
    skills: ["法规检索", "合同审查", "案例分析"],
    color: "#a78bfa",
  },
  {
    name: "全栈开发助手",
    avatar: "👨‍💻",
    skills: ["代码审查", "单元测试", "架构设计", "数据库优化"],
    color: "#60a5fa",
  },
  {
    name: "数据分析师",
    avatar: "📈",
    skills: ["数据可视化", "统计分析"],
    color: "#34d399",
  },
];

export const SceneSkillsConsumer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1a1040", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 120,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background: "linear-gradient(135deg, #ffffff 30%, #07C160 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
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
            const glow = interpolate(
              Math.sin(frame * 0.04 + i * 1.5),
              [-1, 1],
              [0.05, 0.15],
            );

            return (
              <div
                key={a.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: "28px 24px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 24,
                  border: `1px solid rgba(255,255,255,${glow + 0.05})`,
                  width: 320,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                  boxShadow: `0 8px 40px rgba(0,0,0,0.2)`,
                }}
              >
                {/* Agent header */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${COLORS.primary}, ${a.color})`,
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
                        fontSize: 20,
                        fontWeight: 700,
                        color: COLORS.white,
                      }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.4)",
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
                          fontFamily: FONT,
                          fontSize: 13,
                          fontWeight: 500,
                          color: a.color,
                          padding: "5px 12px",
                          borderRadius: 8,
                          background: `rgba(${hexToRgb(a.color)},0.1)`,
                          border: `1px solid rgba(${hexToRgb(a.color)},0.2)`,
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
                    fontFamily: FONT,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.white,
                    padding: "10px 0",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${COLORS.accent}, #05a050)`,
                    textAlign: "center",
                    boxShadow: "0 4px 16px rgba(7,193,96,0.25)",
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

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
