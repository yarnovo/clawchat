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

const skills = [
  { icon: "🐙", name: "GitHub", desc: "Issue / PR / CI" },
  { icon: "💬", name: "Slack", desc: "消息 / 频道" },
  { icon: "📝", name: "Notion", desc: "文档 / 数据库" },
  { icon: "📧", name: "Email", desc: "收发邮件" },
  { icon: "📅", name: "Calendar", desc: "日程管理" },
  { icon: "🔍", name: "Search", desc: "网络搜索" },
];

export const SceneMpDemo: React.FC = () => {
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
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Chat bubble */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 32px",
            borderRadius: 20,
            background: COLORS.accent,
            boxShadow: "0 4px 24px rgba(218,119,86,0.25)",
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 32 }}>💬</div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 30,
              fontWeight: 600,
              color: COLORS.white,
            }}
          >
            "帮我装个 GitHub 技能"
          </div>
        </div>

        {/* Skill grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "center",
            maxWidth: 900,
          }}
        >
          {skills.map((s, i) => {
            const delay = 18 + i * 8;
            const prog = spring({
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
                  gap: 14,
                  padding: "20px 28px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 260,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.85, 1])})`,
                }}
              >
                <div style={{ fontSize: 36 }}>{s.icon}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      color: COLORS.muted,
                    }}
                  >
                    {s.desc}
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
