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
  {
    num: "1",
    title: "选择备份文件",
    cmd: "make db-backup-list",
    detail: "查看 backups/ 下所有 .sql.gz 文件",
  },
  {
    num: "2",
    title: "停止应用服务",
    cmd: "docker compose stop im-server agent-server",
    detail: "避免恢复期间数据写入冲突",
  },
  {
    num: "3",
    title: "导入备份数据",
    cmd: "gunzip -c backup.sql.gz | psql",
    detail: "解压并导入到 PostgreSQL",
  },
  {
    num: "4",
    title: "验证 + 重启",
    cmd: "验证两库表结构 → 重启服务",
    detail: "确认 clawchat + clawchat_agent 都正常",
  },
];

export const SceneBackupRestore: React.FC = () => {
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
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          恢复流程（四步完成）
        </div>

        {/* Four-step vertical list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: 850,
          }}
        >
          {steps.map((s, i) => {
            const delay = 25 + i * 20;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 24px",
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {/* Step number */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(218,119,86,0.08)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.num}
                </div>

                {/* Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.muted,
                    }}
                  >
                    {s.detail}
                  </div>
                </div>

                {/* Command */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    color: COLORS.accent,
                    padding: "6px 12px",
                    background: "rgba(218,119,86,0.06)",
                    borderRadius: 8,
                    flexShrink: 0,
                    maxWidth: 320,
                  }}
                >
                  {s.cmd}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom hint */}
        <div
          style={{
            opacity: interpolate(
              spring({ frame: frame - 120, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
            fontFamily: MONO,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          一键执行：make db-restore FILE=backups/xxx.sql.gz
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
