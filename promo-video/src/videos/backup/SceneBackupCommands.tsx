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

const commands = [
  {
    cmd: "make db-backup",
    desc: "一键备份",
    result: "backups/2026-03-14_030000.sql.gz",
    icon: "📦",
  },
  {
    cmd: "make db-restore FILE=xxx",
    desc: "一键恢复",
    result: "验证表结构 → 重启服务 → 完成",
    icon: "🔄",
  },
  {
    cmd: "make db-backup-list",
    desc: "查看备份",
    result: "列出 backups/ 下所有 .sql.gz",
    icon: "📋",
  },
];

export const SceneBackupCommands: React.FC = () => {
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
          就这三个命令
        </div>

        {/* Terminal-style command cards */}
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

            // Typewriter effect
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
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-40, 0])}px)`,
                  boxShadow: COLORS.cardShadow,
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
                        fontSize: 24,
                        color: COLORS.subtle,
                      }}
                    >
                      $
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 26,
                        fontWeight: 600,
                        color: COLORS.accent,
                      }}
                    >
                      {displayCmd}
                      {cursorOn && (
                        <span style={{ color: COLORS.subtle }}>
                          |
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 28,
                        color: COLORS.muted,
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
                        fontSize: 28,
                        color: COLORS.muted,
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
