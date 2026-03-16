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

const tables = [
  { name: "agents", desc: "Agent 身份 + 状态", icon: "🤖", fields: "id, ownerId, name, status, config" },
  { name: "market_listings", desc: "市场上架记录", icon: "🏪", fields: "agentId, title, price, status" },
  { name: "usage_records", desc: "用量追踪", icon: "📊", fields: "userId, agentId, type, amount" },
  { name: "skill_installations", desc: "技能安装", icon: "🧩", fields: "agentId, skillName, version" },
];

export const SceneSvdbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });

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
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            fontSize: 80,
          }}
        >
          🗄️
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 76,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Database Schema
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          PostgreSQL + Drizzle ORM
        </div>

        {/* 4 Table cards */}
        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {tables.map((t, i) => {
            const prog = spring({
              frame: frame - 30 - i * 8,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "18px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.85, 1])})`,
                  width: 280,
                }}
              >
                <div style={{ fontSize: 32 }}>{t.icon}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.accent,
                    whiteSpace: "pre",
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {t.desc}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.4,
                    whiteSpace: "pre",
                  }}
                >
                  {t.fields}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
