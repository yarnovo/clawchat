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
  { label: "git push", icon: ">" },
  { label: "vitest", icon: ">" },
  { label: "pass / fail", icon: ">" },
  { label: "merge", icon: null },
];

export const SceneTaCi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          CI 流程
        </div>

        {/* Pipeline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {steps.map((step, i) => {
            const delay = 10 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            const isLast = i === steps.length - 1;
            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    padding: "20px 36px",
                    borderRadius: 14,
                    background: isLast
                      ? `linear-gradient(135deg, ${COLORS.card}, rgba(218, 119, 86, 0.06))`
                      : COLORS.card,
                    border: isLast
                      ? `2px solid ${COLORS.accent}`
                      : `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 700,
                      color: isLast ? COLORS.accent : COLORS.text,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
                {step.icon && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 36,
                      color: COLORS.subtle,
                      margin: "0 12px",
                    }}
                  >
                    {step.icon}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {[
            { label: "L1 + L2", desc: "秒级 / 无外部依赖" },
            { label: "L3", desc: "需百炼 API Key" },
            { label: "覆盖率", desc: "合并门槛" },
          ].map((n, i) => {
            const delay = 65 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={n.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {n.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {n.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
