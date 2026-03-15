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
  { label: "用户发消息", mono: "WebSocket" },
  { label: "im-server 转发", mono: ":3000" },
  { label: "agent-server 委托运行时", mono: ":3004" },
  { label: "容器处理 + callback", mono: "Docker" },
  { label: "Redis 队列 → Worker → WebSocket 推送", mono: "async" },
];

export const SceneArchFlow: React.FC = () => {
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
          gap: 32,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          消息数据流
        </div>

        {/* Flow steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {steps.map((step, i) => {
            const delay = 10 + i * 10;
            const stepProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(stepProg, [0, 1], [20, 0])}px)`,
                }}
              >
                {/* Step card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    padding: "14px 32px",
                    minWidth: 500,
                    justifyContent: "center",
                  }}
                >
                  {/* Step number */}
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.card,
                      background: COLORS.accent,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>

                  {/* Label */}
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.text,
                      fontWeight: 500,
                    }}
                  >
                    {step.label}
                  </div>

                  {/* Mono tag */}
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.accent,
                      padding: "2px 10px",
                      borderRadius: 6,
                      background: "rgba(218,119,86,0.06)",
                      border: `1px solid rgba(218,119,86,0.15)`,
                      flexShrink: 0,
                    }}
                  >
                    {step.mono}
                  </div>
                </div>

                {/* Arrow (not on last step) */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      padding: "4px 0",
                    }}
                  >
                    ↓
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
