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
  {
    num: "1",
    title: "选择备份文件",
    cmd: "make db-backup-list",
    detail: "查看 backups/ 下所有 .sql.gz 文件",
    color: "#60a5fa",
  },
  {
    num: "2",
    title: "停止应用服务",
    cmd: "docker compose stop im-server agent-server",
    detail: "避免恢复期间数据写入冲突",
    color: "#f59e0b",
  },
  {
    num: "3",
    title: "导入备份数据",
    cmd: "gunzip -c backup.sql.gz | psql",
    detail: "解压并导入到 PostgreSQL",
    color: "#a78bfa",
  },
  {
    num: "4",
    title: "验证 + 重启",
    cmd: "验证两库表结构 → 重启服务",
    detail: "确认 clawchat + clawchat_agent 都正常",
    color: "#34d399",
  },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneBackupRestore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1e1a4e", "#0c0a2e"]} />
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
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background:
              "linear-gradient(135deg, #ffffff 20%, #f59e0b 60%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          恢复流程（四步完成）
        </div>

        {/* 四步垂直列表 */}
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
            const rgb = hexToRgb(s.color);

            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 24px",
                  background: `rgba(${rgb},0.03)`,
                  borderRadius: 14,
                  border: `1px solid rgba(${rgb},0.1)`,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                }}
              >
                {/* 步骤编号 */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 24,
                    fontWeight: 800,
                    color: s.color,
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `rgba(${rgb},0.1)`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.num}
                </div>

                {/* 内容 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 20,
                      fontWeight: 700,
                      color: s.color,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 14,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {s.detail}
                  </div>
                </div>

                {/* 命令 */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    color: `rgba(${rgb},0.6)`,
                    padding: "6px 12px",
                    background: "rgba(0,0,0,0.3)",
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

        {/* 底部提示 */}
        <div
          style={{
            opacity: interpolate(
              spring({ frame: frame - 120, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
            fontFamily: MONO,
            fontSize: 16,
            color: "rgba(255,255,255,0.3)",
          }}
        >
          一键执行：make db-restore FILE=backups/xxx.sql.gz
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
