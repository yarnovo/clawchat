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
          ClawHub 技能市场
        </div>

        {/* Counter */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(countProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(countProg, [0, 1], [0.7, 1])})`,
          }}
        >
          {Math.floor(interpolate(countProg, [0, 1], [0, 13700])).toLocaleString()}+
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
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

            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.8, 1])})`,
                }}
              >
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {s.desc}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.muted,
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
