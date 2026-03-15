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
  { num: "\u2460", label: "Flutter \u2192 REST API", desc: "\u5ba2\u6237\u7aef\u53d1\u9001\u6d88\u606f" },
  { num: "\u2461", label: "im-server JWT \u9a8c\u8bc1", desc: "\u8eab\u4efd\u8ba4\u8bc1\u4e0e\u6743\u9650\u68c0\u67e5" },
  { num: "\u2462", label: "\u5199\u5165 PostgreSQL Message \u8868", desc: "\u6301\u4e45\u5316\u5b58\u50a8\u6d88\u606f" },
];

export const SceneMsgSend: React.FC = () => {
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
          消息发送
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {steps.map((step, i) => {
            const stepProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(stepProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(stepProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Step number */}
                <div
                  style={{
                    fontSize: 48,
                    flexShrink: 0,
                    width: 60,
                    textAlign: "center",
                    color: COLORS.accent,
                  }}
                >
                  {step.num}
                </div>

                {/* Step card */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    padding: "16px 28px",
                    width: 560,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 30,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
