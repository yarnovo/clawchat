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

const rows = [
  { label: "备份什么", value: "PostgreSQL 全部数据库", detail: "pg_dumpall", color: "#60a5fa" },
  { label: "备份频率", value: "每日凌晨 3 点 + 每次部署前", detail: "cron + CI/CD", color: "#a78bfa" },
  { label: "保留策略", value: "最近 7 天，超期自动清理", detail: "find -mtime +7 -delete", color: "#f59e0b" },
  { label: "存储位置", value: "ECS /opt/clawchat/backups/", detail: "gzip 压缩", color: "#34d399" },
  { label: "Redis", value: "开启 RDB 持久化", detail: "--save 60 1", color: "#f472b6" },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneBackupOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0c2e", "#1a1e4e", "#0a0c2e"]} />
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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background:
              "linear-gradient(135deg, #ffffff 20%, #60a5fa 60%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          方案总览
        </div>

        {/* 表格式布局 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 900,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 20,
            padding: "24px 28px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {rows.map((row, i) => {
            const delay = 25 + i * 16;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const rgb = hexToRgb(row.color);

            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "14px 20px",
                  background: `rgba(${rgb},0.03)`,
                  borderRadius: 12,
                  border: `1px solid rgba(${rgb},0.08)`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                }}
              >
                {/* 标签 */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 18,
                    fontWeight: 700,
                    color: row.color,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {row.label}
                </div>

                {/* 分隔线 */}
                <div
                  style={{
                    width: 2,
                    height: 28,
                    background: `rgba(${rgb},0.15)`,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />

                {/* 值 */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 18,
                    color: "rgba(255,255,255,0.8)",
                    flex: 1,
                  }}
                >
                  {row.value}
                </div>

                {/* 技术细节标签 */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: `rgba(${rgb},0.6)`,
                    padding: "4px 10px",
                    background: `rgba(${rgb},0.06)`,
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
