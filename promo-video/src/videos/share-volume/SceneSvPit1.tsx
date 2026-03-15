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

const examples = [
  {
    icon: "❌",
    code: "volumes: /root/.openclaw",
    desc: "USER node → 数据写到别处",
    bad: true,
  },
  {
    icon: "✅",
    code: "volumes: /home/node/.openclaw",
    desc: "路径和 USER 一致",
    bad: false,
  },
];

export const SceneSvPit1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          坑 1：路径和用户不匹配
        </div>

        {/* Code comparison cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {examples.map((ex, i) => {
            const cardProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={ex.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${ex.bad ? "rgba(220,80,60,0.3)" : "rgba(80,180,80,0.3)"}`,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 32px",
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 40, flexShrink: 0 }}>{ex.icon}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {ex.code}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {ex.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tip */}
        {(() => {
          const tipProg = spring({
            frame: frame - 40,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                fontWeight: 600,
                color: COLORS.accent,
                opacity: interpolate(tipProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(tipProg, [0, 1], [20, 0])}px)`,
                marginTop: 12,
              }}
            >
              先确认容器内运行用户
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
