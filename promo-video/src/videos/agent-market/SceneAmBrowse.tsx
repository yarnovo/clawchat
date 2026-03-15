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

const agents = [
  { name: "法律助手", rating: 4.8, uses: "12.3k", skills: ["合同审查", "法规咨询"], tools: ["PDF阅读", "搜索"] },
  { name: "电商运营", rating: 4.6, uses: "8.7k", skills: ["选品分析", "文案生成"], tools: ["数据抓取", "Excel"] },
  { name: "代码审查", rating: 4.9, uses: "15.1k", skills: ["PR Review", "安全扫描"], tools: ["GitHub", "终端"] },
  { name: "客服机器人", rating: 4.5, uses: "21.4k", skills: ["多轮对话", "工单处理"], tools: ["邮件", "CRM"] },
  { name: "数据分析", rating: 4.7, uses: "9.8k", skills: ["SQL生成", "可视化"], tools: ["Python", "图表"] },
];

export const SceneAmBrowse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent 目录
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            maxWidth: 1200,
          }}
        >
          {agents.map((a, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={a.name}
                style={{
                  width: 220,
                  padding: "20px 18px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.accent, fontWeight: 600 }}>
                    {"★".repeat(Math.floor(a.rating))} {a.rating}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                    {a.uses}
                  </div>
                </div>

                {/* 技能标签 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.muted, fontWeight: 600 }}>
                    技能
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {a.skills.map((skill) => (
                      <div
                        key={skill}
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 16,
                          color: COLORS.accent,
                          padding: "2px 8px",
                          borderRadius: 5,
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.accent}40`,
                        }}
                      >
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 工具标签 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.muted, fontWeight: 600 }}>
                    工具
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {a.tools.map((tool) => (
                      <div
                        key={tool}
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 16,
                          color: COLORS.muted,
                          padding: "2px 8px",
                          borderRadius: 5,
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {tool}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
