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

const flowSteps = [
  { icon: "🏷️", label: "push tag", highlight: false },
  { icon: "🔨", label: "CI build", highlight: false },
  { icon: "📤", label: "rsync scripts/", highlight: false },
  { icon: "💾", label: "db-backup\n--tag pre-deploy", highlight: true },
  { icon: "🚀", label: "docker compose\nup -d", highlight: false },
  { icon: "✅", label: "health check", highlight: false },
];

export const SceneBackupDeploy: React.FC = () => {
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
            防线 2
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            部署前自动备份
          </div>
        </div>

        {/* CI/CD Flow */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {flowSteps.map((s, i) => {
            const delay = 20 + i * 16;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: s.highlight ? "24px 18px" : "20px 14px",
                    background: "#fff",
                    borderRadius: 12,
                    border: s.highlight
                      ? `2px solid ${COLORS.accent}`
                      : `1px solid ${COLORS.border}`,
                    width: s.highlight ? 155 : 135,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [40, 0])}px) scale(${s.highlight ? 1.05 : 1})`,
                    boxShadow: s.highlight
                      ? "0 4px 24px rgba(218,119,86,0.12)"
                      : COLORS.cardShadow,
                  }}
                >
                  <div style={{ fontSize: 32 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: s.highlight ? MONO : FONT_SANS,
                      fontSize: s.highlight ? 16 : 18,
                      fontWeight: s.highlight ? 700 : 500,
                      color: s.highlight ? COLORS.accent : COLORS.text,
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
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.subtle,
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

        {/* Note */}
        <div
          style={{
            opacity: interpolate(
              spring({ frame: frame - 120, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1]
            ),
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: COLORS.accent }}>⚡</span>
          Prisma 迁移失败？一键恢复到部署前的备份点
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
