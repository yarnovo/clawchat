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
  { label: "用户消息 → agent-server", icon: "💬" },
  { label: "查找 Agent 配置", icon: "🔍" },
  { label: "runtime-client 转发", icon: "📡" },
  { label: "容器处理 + callback", icon: "⚙️" },
];

export const SceneAswChat: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          消息代理
        </div>

        {/* Flow steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {flowSteps.map((step, i) => {
            const delay = 10 + i * 10;
            const stepProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    opacity: interpolate(stepProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(stepProg, [0, 1], [40, 0])}px)`,
                  }}
                >
                  {/* Step number */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      background: COLORS.accent,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.white,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>

                  {/* Card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      padding: "16px 28px",
                      boxShadow: COLORS.cardShadow,
                      minWidth: 500,
                    }}
                  >
                    <div style={{ fontSize: 32, flexShrink: 0 }}>{step.icon}</div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 28,
                        color: COLORS.text,
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                </div>

                {/* Connector arrow */}
                {i < flowSteps.length - 1 && (
                  <div
                    style={{
                      marginLeft: 22,
                      fontFamily: MONO,
                      fontSize: 20,
                      color: COLORS.subtle,
                      opacity: interpolate(stepProg, [0, 1], [0, 0.6]),
                    }}
                  >
                    │
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        {(() => {
          const noteProg = spring({
            frame: frame - 55,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
                marginTop: 8,
                opacity: interpolate(noteProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(noteProg, [0, 1], [15, 0])}px)`,
              }}
            >
              agent-server 不存储消息
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
