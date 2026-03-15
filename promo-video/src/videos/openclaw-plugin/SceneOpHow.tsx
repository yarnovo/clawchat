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
  { num: "1", label: "用户发消息" },
  { num: "2", label: "im-server 转发" },
  { num: "3", label: "agent-server → OpenClaw Channel" },
  { num: "4", label: "Agent 处理 → callback" },
];

export const SceneOpHow: React.FC = () => {
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
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          工作原理
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {steps.map((s, i) => {
            const delay = 15 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isLast = i === steps.length - 1;

            return (
              <div
                key={s.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "28px 24px",
                    borderRadius: 14,
                    background: isLast ? COLORS.accent : COLORS.card,
                    border: `1px solid ${isLast ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    width: 260,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      fontWeight: 800,
                      color: isLast ? COLORS.white : COLORS.accent,
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      fontWeight: 600,
                      color: isLast ? "rgba(255,255,255,0.85)" : COLORS.text,
                      textAlign: "center",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
