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

const risks = [
  {
    icon: "🗄️",
    title: "PostgreSQL 无备份",
    items: [
      "clawchat — 用户、好友、消息",
      "clawchat_agent — Agent 配置、状态",
    ],
    consequence: "硬盘损坏 → 全部数据不可恢复",
  },
  {
    icon: "⚡",
    title: "Redis 无持久化",
    items: [
      "消息队列存在内存中",
      "Agent 回复队列 (agent-reply)",
    ],
    consequence: "容器重启 → 队列中消息丢失",
  },
  {
    icon: "🚀",
    title: "部署无保护",
    items: [
      "CI/CD 直接 docker compose up",
      "Prisma migrate 无回滚点",
    ],
    consequence: "迁移失败 → 数据库状态不一致",
  },
];

export const SceneBackupRisks: React.FC = () => {
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
          gap: 44,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          当前现状：三大风险
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {risks.map((r, i) => {
            const delay = 20 + i * 22;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });

            return (
              <div
                key={r.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: 32,
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  width: 340,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [60, 0])}px)`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 40 }}>{r.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {r.title}
                  </div>
                </div>

                {/* Detail list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                  {r.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 28,
                        color: COLORS.muted,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: COLORS.subtle }}>•</span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Consequence */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.accent,
                    padding: "8px 12px",
                    background: "rgba(218,119,86,0.06)",
                    borderRadius: 8,
                    borderLeft: `3px solid ${COLORS.accent}`,
                    marginTop: 4,
                  }}
                >
                  {r.consequence}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
