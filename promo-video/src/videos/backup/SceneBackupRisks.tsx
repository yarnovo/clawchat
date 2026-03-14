import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT, MONO } from "../../constants";

const risks = [
  {
    icon: "🗄️",
    title: "PostgreSQL 无备份",
    items: [
      "clawchat — 用户、好友、消息",
      "clawchat_agent — Agent 配置、状态",
    ],
    consequence: "硬盘损坏 → 全部数据不可恢复",
    color: "#ff6b6b",
  },
  {
    icon: "⚡",
    title: "Redis 无持久化",
    items: [
      "消息队列存在内存中",
      "Agent 回复队列 (agent-reply)",
    ],
    consequence: "容器重启 → 队列中消息丢失",
    color: "#f59e0b",
  },
  {
    icon: "🚀",
    title: "部署无保护",
    items: [
      "CI/CD 直接 docker compose up",
      "Prisma migrate 无回滚点",
    ],
    consequence: "迁移失败 → 数据库状态不一致",
    color: "#a78bfa",
  },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneBackupRisks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#1a0a0a", "#2e1a1a", "#1a0a0a"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
          paddingBottom: 120,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background: "linear-gradient(135deg, #ffffff 30%, #ff6b6b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
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
            const rgb = hexToRgb(r.color);

            return (
              <div
                key={r.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  padding: "28px 24px",
                  background: `rgba(${rgb},0.04)`,
                  borderRadius: 20,
                  border: `1px solid rgba(${rgb},0.12)`,
                  width: 340,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [60, 0])}px)`,
                  boxShadow: `0 8px 40px rgba(${rgb},0.08)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 36 }}>{r.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 22,
                      fontWeight: 700,
                      color: r.color,
                    }}
                  >
                    {r.title}
                  </div>
                </div>

                {/* 详情列表 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                  {r.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.5)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: `rgba(${rgb},0.4)` }}>•</span>
                      {item}
                    </div>
                  ))}
                </div>

                {/* 后果 */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 14,
                    color: r.color,
                    padding: "8px 12px",
                    background: `rgba(${rgb},0.06)`,
                    borderRadius: 10,
                    borderLeft: `3px solid ${r.color}`,
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
