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

const skills = [
  { icon: "🌐", name: "web-search", desc: "网页搜索", downloads: "12.3k" },
  { icon: "💻", name: "code-review", desc: "代码审查", downloads: "8.7k" },
  { icon: "📊", name: "data-analysis", desc: "数据分析", downloads: "6.2k" },
  { icon: "📧", name: "email-draft", desc: "邮件撰写", downloads: "5.1k" },
  { icon: "🔍", name: "deep-research", desc: "深度调研", downloads: "4.8k" },
  { icon: "🖼️", name: "image-gen", desc: "图片生成", downloads: "9.5k" },
];

export const SceneSkillsSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  const countProg = spring({ frame: frame - 30, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0c2e", "#0a1a3e", "#0a0c2e"]} />
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
            background: "linear-gradient(135deg, #ffffff 30%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          ClawHub 技能市场
        </div>

        {/* Counter */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 800,
            opacity: interpolate(countProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(countProg, [0, 1], [0.7, 1])})`,
            color: COLORS.cyan,
            textShadow: "0 0 40px rgba(0,210,255,0.3)",
          }}
        >
          {Math.floor(interpolate(countProg, [0, 1], [0, 13700])).toLocaleString()}+
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            marginTop: -20,
            opacity: interpolate(countProg, [0, 1], [0, 1]),
          }}
        >
          来自社区的技能，持续增长
        </div>

        {/* Skill grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
            maxWidth: 1200,
          }}
        >
          {skills.map((s, i) => {
            const delay = 40 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const glow = interpolate(
              Math.sin(frame * 0.04 + i * 1.2),
              [-1, 1],
              [0.05, 0.15],
            );

            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  background: `rgba(96,165,250,0.04)`,
                  borderRadius: 14,
                  border: `1px solid rgba(96,165,250,${glow + 0.08})`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.8, 1])})`,
                  boxShadow: `0 4px 20px rgba(96,165,250,${glow})`,
                }}
              >
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 16,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    {s.desc}
                  </div>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, SF Mono, monospace",
                      fontSize: 12,
                      color: "rgba(255,255,255,0.35)",
                    }}
                  >
                    {s.name} · {s.downloads}
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
