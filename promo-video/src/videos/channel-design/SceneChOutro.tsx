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
  { phase: "Phase 1", label: "Web 聊天", desc: "最快上线", icon: "🌐" },
  { phase: "Phase 2", label: "Flutter App", desc: "体验最好", icon: "📱" },
  { phase: "Phase 3", label: "多渠道", desc: "覆盖最广", icon: "🔗" },
];

const bullets = [
  "Channel 层 = Agent 与用户的桥梁",
  "统一接口，4 个方法",
  "Web 最快 → App 最佳 → 多渠道最广",
];

export const SceneChOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          实施路径
        </div>

        {/* Phase cards */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {steps.map((s, i) => {
            const cardProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });
            return (
              <div key={s.phase} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    background: COLORS.card,
                    border: `2px solid ${i === 0 ? COLORS.accent : COLORS.border}`,
                    borderRadius: 16,
                    padding: "24px 32px",
                    boxShadow: i === 0 ? "0 4px 20px rgba(218,119,86,0.15)" : COLORS.cardShadow,
                    minWidth: 180,
                    opacity: interpolate(cardProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 44 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 16,
                      color: COLORS.accent,
                      fontWeight: 600,
                    }}
                  >
                    {s.phase}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 32,
                      color: COLORS.accent,
                      opacity: interpolate(cardProg, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {bullets.map((text, i) => {
            const prog = spring({
              frame: frame - 50 - i * 10,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 28, flexShrink: 0 }}>✅</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
