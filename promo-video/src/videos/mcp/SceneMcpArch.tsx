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
  "Agent 容器",
  "HTTP 请求",
  "mcp-server :8000",
  "执行工具",
  "返回结果",
];

export const SceneMcpArch: React.FC = () => {
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          架构
        </div>

        {/* Vertical flow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {steps.map((step, i) => {
            const prog = spring({
              frame: frame - 10 - i * 8,
              fps,
              config: { damping: 14 },
            });
            const isServer = step.includes("mcp-server");
            return (
              <div
                key={step}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Arrow (except first) */}
                {i > 0 && (
                  <div
                    style={{
                      width: 2,
                      height: 28,
                      background: COLORS.border,
                      opacity: interpolate(prog, [0, 1], [0, 0.6]),
                    }}
                  />
                )}
                {i > 0 && (
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderTop: `10px solid ${COLORS.border}`,
                      opacity: interpolate(prog, [0, 1], [0, 0.6]),
                      marginBottom: 6,
                    }}
                  />
                )}
                {/* Step box */}
                <div
                  style={{
                    fontFamily: isServer ? MONO : FONT_SANS,
                    fontSize: 32,
                    fontWeight: isServer ? 700 : 500,
                    color: isServer ? COLORS.accent : COLORS.text,
                    padding: "12px 36px",
                    borderRadius: 12,
                    background: COLORS.card,
                    border: `1px solid ${isServer ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {step}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
