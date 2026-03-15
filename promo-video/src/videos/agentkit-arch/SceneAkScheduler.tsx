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
  { label: "HEARTBEAT.md", sub: "cron 表达式", icon: "HB" },
  { label: "scheduler", sub: "解析 + 定时", icon: "S" },
  { label: "agent.run()", sub: "同一条路", icon: "C" },
];

const outputs = [
  { label: "Channel", desc: "推给用户" },
  { label: "MEMORY.md", desc: "写入记忆" },
];

export const SceneAkScheduler: React.FC = () => {
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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          定时链路
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          scheduler {"\u2192"} core {"\u2192"} 输出
        </div>

        {/* Main flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {steps.map((step, i) => {
            const delay = 15 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isScheduler = step.label === "scheduler";
            const isCore = step.label === "agent.run()";
            const highlight = isScheduler || isCore;
            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    background: highlight ? COLORS.accent : COLORS.card,
                    border: highlight ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: "24px 36px",
                    boxShadow: highlight
                      ? "0 4px 24px rgba(218,119,86,0.2)"
                      : COLORS.cardShadow,
                    minWidth: 160,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: highlight ? COLORS.white : COLORS.accent,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 600,
                      color: highlight ? COLORS.white : COLORS.text,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 16,
                      color: highlight ? "rgba(255,255,255,0.8)" : COLORS.muted,
                    }}
                  >
                    {step.sub}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 32,
                      color: COLORS.accent,
                      padding: "0 18px",
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Output branches */}
        <div style={{ display: "flex", gap: 32 }}>
          {outputs.map((out, i) => {
            const delay = 60 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={out.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "16px 28px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {out.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {out.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
