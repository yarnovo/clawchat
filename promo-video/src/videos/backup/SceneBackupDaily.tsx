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

const steps = [
  { icon: "🕐", label: "cron 触发", detail: "0 3 * * *", desc: "每日凌晨 3 点" },
  { icon: "📤", label: "pg_dumpall", detail: "-U clawchat", desc: "导出全部数据库" },
  { icon: "📦", label: "gzip 压缩", detail: "| gzip >", desc: "压缩存储" },
  { icon: "✅", label: "完整性验证", detail: "gzip -t", desc: "检查文件大小 + 完整性" },
  { icon: "🗑️", label: "清理旧备份", detail: "-mtime +7", desc: "删除 7 天前的文件" },
];

export const SceneBackupDaily: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a1020", "#102040", "#0a1020"]} />
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
        {/* 标题 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 20,
              fontWeight: 600,
              color: "#60a5fa",
              padding: "6px 16px",
              background: "rgba(96,165,250,0.1)",
              borderRadius: 8,
              border: "1px solid rgba(96,165,250,0.2)",
            }}
          >
            防线 1
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 20%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            每日自动备份
          </div>
        </div>

        {/* 流程图 — 横向 steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {steps.map((s, i) => {
            const delay = 25 + i * 18;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                {/* 步骤卡片 */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "24px 20px",
                    background: "rgba(96,165,250,0.04)",
                    borderRadius: 16,
                    border: "1px solid rgba(96,165,250,0.1)",
                    width: 170,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [40, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#60a5fa",
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      color: "rgba(96,165,250,0.5)",
                      padding: "3px 8px",
                      background: "rgba(96,165,250,0.06)",
                      borderRadius: 4,
                    }}
                  >
                    {s.detail}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 13,
                      color: "rgba(255,255,255,0.4)",
                      textAlign: "center",
                    }}
                  >
                    {s.desc}
                  </div>
                </div>

                {/* 箭头连接线 */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 20,
                      color: "rgba(96,165,250,0.3)",
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                      padding: "0 2px",
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 输出文件格式 */}
        <div
          style={{
            opacity: interpolate(
              spring({ frame: frame - 120, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 16,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            输出格式
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 16,
              color: "rgba(96,165,250,0.7)",
              padding: "6px 16px",
              background: "rgba(96,165,250,0.06)",
              borderRadius: 8,
              border: "1px solid rgba(96,165,250,0.1)",
            }}
          >
            2026-03-14_030000.sql.gz
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
