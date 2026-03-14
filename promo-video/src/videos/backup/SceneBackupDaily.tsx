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
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.accent,
              padding: "6px 16px",
              background: "rgba(218,119,86,0.08)",
              borderRadius: 8,
              border: `1px solid rgba(218,119,86,0.15)`,
            }}
          >
            防线 1
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            每日自动备份
          </div>
        </div>

        {/* Flow chart - horizontal steps */}
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
                {/* Step card */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "24px 20px",
                    background: "#fff",
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    width: 170,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [40, 0])}px)`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      color: COLORS.accent,
                      padding: "3px 8px",
                      background: "rgba(218,119,86,0.06)",
                      borderRadius: 4,
                    }}
                  >
                    {s.detail}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      color: COLORS.muted,
                      textAlign: "center",
                    }}
                  >
                    {s.desc}
                  </div>
                </div>

                {/* Arrow connector */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.subtle,
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

        {/* Output format */}
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
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.muted,
            }}
          >
            输出格式
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              color: COLORS.text,
              padding: "6px 16px",
              background: "#fff",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            2026-03-14_030000.sql.gz
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
