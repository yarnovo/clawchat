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
  { label: "App", sub: "POST api/chat", icon: "App" },
  { label: "Channel", sub: "agent.run()", icon: "Ch" },
  { label: "core", sub: "while loop", icon: "C" },
  { label: "LLM", sub: "tool_use", icon: "AI" },
  { label: "tools", sub: "bash / read", icon: "T" },
];

export const SceneAkFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          消息链路
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          用户发消息 → Agent 回复
        </div>

        {/* Forward flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {flowSteps.map((step, i) => {
            const delay = 20 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isCore = step.label === "core" || step.label === "LLM" || step.label === "tools";
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
                    background: isCore ? COLORS.accent : COLORS.card,
                    border: isCore ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: "20px 28px",
                    boxShadow: isCore
                      ? "0 4px 24px rgba(218,119,86,0.2)"
                      : COLORS.cardShadow,
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: isCore ? COLORS.white : COLORS.accent,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isCore ? COLORS.white : COLORS.text,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 15,
                      color: isCore ? "rgba(255,255,255,0.8)" : COLORS.muted,
                    }}
                  >
                    {step.sub}
                  </div>
                </div>
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      color: COLORS.accent,
                      padding: "0 12px",
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

        {/* Return path */}
        {(() => {
          const retProg = spring({
            frame: frame - 75,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: interpolate(retProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(retProg, [0, 1], [20, 0])}px)`,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "14px 32px",
                boxShadow: COLORS.cardShadow,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  color: COLORS.accent,
                  fontWeight: 600,
                }}
              >
                {"\u2190"} SSE
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.text,
                }}
              >
                Channel {"\u2192"} App (流式回复)
              </div>
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
