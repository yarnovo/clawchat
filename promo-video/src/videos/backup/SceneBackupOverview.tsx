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

const rows = [
  { label: "备份什么", value: "PostgreSQL 全部数据库", detail: "pg_dumpall" },
  { label: "备份频率", value: "每日凌晨 3 点 + 每次部署前", detail: "cron + CI/CD" },
  { label: "保留策略", value: "最近 7 天，超期自动清理", detail: "find -mtime +7 -delete" },
  { label: "存储位置", value: "ECS /opt/clawchat/backups/", detail: "gzip 压缩" },
  { label: "Redis", value: "开启 RDB 持久化", detail: "--save 60 1" },
];

export const SceneBackupOverview: React.FC = () => {
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
          方案总览
        </div>

        {/* Table layout */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: 900,
            background: "#fff",
            borderRadius: 12,
            padding: "24px 28px",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          {rows.map((row, i) => {
            const delay = 25 + i * 16;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "14px 20px",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                  borderRadius: 8,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                }}
              >
                {/* Label */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {row.label}
                </div>

                {/* Divider */}
                <div
                  style={{
                    width: 2,
                    height: 28,
                    background: COLORS.border,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />

                {/* Value */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    flex: 1,
                  }}
                >
                  {row.value}
                </div>

                {/* Technical detail tag */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    color: COLORS.accent,
                    padding: "4px 10px",
                    background: "rgba(218,119,86,0.06)",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  {row.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
