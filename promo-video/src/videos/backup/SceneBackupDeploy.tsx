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

const flowSteps = [
  { icon: "🏷️", label: "push tag", color: "rgba(167,139,250,0.5)" },
  { icon: "🔨", label: "CI build", color: "rgba(167,139,250,0.5)" },
  { icon: "📤", label: "rsync scripts/", color: "rgba(167,139,250,0.5)" },
  { icon: "💾", label: "db-backup\n--tag pre-deploy", color: "#f59e0b", highlight: true },
  { icon: "🚀", label: "docker compose\nup -d", color: "rgba(167,139,250,0.5)" },
  { icon: "✅", label: "health check", color: "rgba(167,139,250,0.5)" },
];

export const SceneBackupDeploy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#1a0e2e", "#2e1a4e", "#1a0e2e"]} />
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
              color: "#a78bfa",
              padding: "6px 16px",
              background: "rgba(167,139,250,0.1)",
              borderRadius: 8,
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            防线 2
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #ffffff 20%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            部署前自动备份
          </div>
        </div>

        {/* CI/CD 流程图 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {flowSteps.map((s, i) => {
            const delay = 20 + i * 16;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const isHighlight = (s as any).highlight;
            const glow = isHighlight
              ? interpolate(Math.sin(frame * 0.06), [-1, 1], [0.1, 0.25])
              : 0;

            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: isHighlight ? "24px 18px" : "20px 14px",
                    background: isHighlight
                      ? "rgba(245,158,11,0.06)"
                      : "rgba(167,139,250,0.03)",
                    borderRadius: 14,
                    border: isHighlight
                      ? "2px solid rgba(245,158,11,0.3)"
                      : "1px solid rgba(167,139,250,0.08)",
                    width: isHighlight ? 155 : 135,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [40, 0])}px) scale(${isHighlight ? 1.05 : 1})`,
                    boxShadow: isHighlight
                      ? `0 0 30px rgba(245,158,11,${glow})`
                      : "none",
                  }}
                >
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: isHighlight ? MONO : FONT,
                      fontSize: isHighlight ? 13 : 14,
                      fontWeight: isHighlight ? 700 : 500,
                      color: typeof s.color === "string" && isHighlight ? s.color : "rgba(167,139,250,0.7)",
                      textAlign: "center",
                      lineHeight: 1.4,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 18,
                      color: "rgba(167,139,250,0.25)",
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                      padding: "0 1px",
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 说明 */}
        <div
          style={{
            opacity: interpolate(
              spring({ frame: frame - 120, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
            fontFamily: FONT,
            fontSize: 18,
            color: "rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "#f59e0b" }}>⚡</span>
          Prisma 迁移失败？一键恢复到部署前的备份点
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
