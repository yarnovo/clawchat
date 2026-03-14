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

const commands = [
  {
    cmd: "make db-backup",
    desc: "一键备份",
    result: "backups/2026-03-14_030000.sql.gz",
    icon: "📦",
    color: "#34d399",
  },
  {
    cmd: "make db-restore FILE=xxx",
    desc: "一键恢复",
    result: "验证表结构 → 重启服务 → 完成",
    icon: "🔄",
    color: "#60a5fa",
  },
  {
    cmd: "make db-backup-list",
    desc: "查看备份",
    result: "列出 backups/ 下所有 .sql.gz",
    icon: "📋",
    color: "#a78bfa",
  },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneBackupCommands: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#050c0a", "#0a2e1a", "#050c0a"]} />
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
        {/* 标题 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background:
              "linear-gradient(135deg, #ffffff 20%, #34d399 60%, #60a5fa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          就这三个命令
        </div>

        {/* 终端风格命令卡片 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 800,
          }}
        >
          {commands.map((c, i) => {
            const delay = 20 + i * 25;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const rgb = hexToRgb(c.color);

            // 打字机效果：命令逐字显示
            const typeDelay = delay + 10;
            const charsVisible = Math.min(
              Math.max(0, Math.floor((frame - typeDelay) / 1.5)),
              c.cmd.length
            );
            const displayCmd = c.cmd.slice(0, charsVisible);
            const cursorOn =
              charsVisible < c.cmd.length && frame % 12 < 8;

            return (
              <div
                key={c.cmd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "20px 28px",
                  background: "rgba(0,0,0,0.4)",
                  borderRadius: 16,
                  border: `1px solid rgba(${rgb},0.15)`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-40, 0])}px)`,
                  boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
                }}
              >
                <div style={{ fontSize: 36, flexShrink: 0 }}>{c.icon}</div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 14,
                        color: c.color,
                        opacity: 0.6,
                      }}
                    >
                      $
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        fontWeight: 600,
                        color: c.color,
                      }}
                    >
                      {displayCmd}
                      {cursorOn && (
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>
                          |
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 16,
                        color: "rgba(255,255,255,0.4)",
                        marginLeft: "auto",
                      }}
                    >
                      {c.desc}
                    </span>
                  </div>
                  {charsVisible >= c.cmd.length && (
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        color: "rgba(255,255,255,0.3)",
                      }}
                    >
                      → {c.result}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
