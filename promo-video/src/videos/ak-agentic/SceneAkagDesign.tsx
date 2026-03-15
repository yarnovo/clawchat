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

export const SceneAkagDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 12, mass: 0.8 } });
  const bridgeProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const rightProg = spring({ frame: frame - 48, fps, config: { damping: 12, mass: 0.8 } });

  const circleSize = 240;
  const circleGap = 360;

  // Pulsing ring effect for loops
  const pulseLeft = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.95, 1.05],
  );
  const pulseRight = interpolate(
    Math.sin((frame + 15) * 0.08),
    [-1, 1],
    [0.95, 1.05],
  );

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
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
          AgentRunner 双循环
        </div>

        {/* Loops + Bridge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            position: "relative",
          }}
        >
          {/* Left: Event Loop */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(leftProg, [0, 1], [0.6, 1]) * pulseLeft})`,
            }}
          >
            <div
              style={{
                width: circleSize,
                height: circleSize,
                borderRadius: "50%",
                border: `4px solid ${COLORS.accent}`,
                background: "rgba(218,119,86,0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 0 40px rgba(218,119,86,0.12)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.accent,
                }}
              >
                Event Loop
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  color: COLORS.muted,
                }}
              >
                接收外部事件
              </div>
            </div>
            {/* Event arrows flowing in */}
            <div style={{ display: "flex", gap: 8 }}>
              {["Msg", "Cmd", "Hook"].map((label, i) => {
                const arrowDelay = 20 + i * 8;
                const arrowProg = spring({
                  frame: frame - arrowDelay,
                  fps,
                  config: { damping: 14, mass: 0.5 },
                });
                return (
                  <div
                    key={label}
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.muted,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      opacity: interpolate(arrowProg, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(arrowProg, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bridge: AgentRunner */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              width: circleGap,
              opacity: interpolate(bridgeProg, [0, 1], [0, 1]),
            }}
          >
            {/* Arrow line */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.subtle}, ${COLORS.accent})`,
                  borderRadius: 2,
                  transform: `scaleX(${interpolate(bridgeProg, [0, 1], [0, 1])})`,
                  transformOrigin: "left",
                }}
              />
              {/* Arrow head */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: `14px solid ${COLORS.accent}`,
                  borderTop: "8px solid transparent",
                  borderBottom: "8px solid transparent",
                  opacity: interpolate(bridgeProg, [0, 1], [0, 1]),
                }}
              />
            </div>
            {/* Label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.accent,
                background: COLORS.card,
                border: `2px solid ${COLORS.accent}`,
                borderRadius: 12,
                padding: "10px 28px",
                boxShadow: "0 4px 20px rgba(218,119,86,0.15)",
                transform: `translateY(${interpolate(bridgeProg, [0, 1], [15, 0])}px)`,
              }}
            >
              AgentRunner
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
                opacity: interpolate(bridgeProg, [0, 1], [0, 1]),
              }}
            >
              事件 → Agent 输入
            </div>
          </div>

          {/* Right: Agent Loop */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(rightProg, [0, 1], [0.6, 1]) * pulseRight})`,
            }}
          >
            <div
              style={{
                width: circleSize,
                height: circleSize,
                borderRadius: "50%",
                border: `4px solid ${COLORS.text}`,
                background: "rgba(26,26,26,0.04)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 0 40px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                Agent Loop
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  color: COLORS.muted,
                }}
              >
                LLM 思考循环
              </div>
            </div>
            {/* Cycling indicators */}
            <div style={{ display: "flex", gap: 8 }}>
              {["Think", "Act", "Reply"].map((label, i) => {
                const cycDelay = 56 + i * 8;
                const cycProg = spring({
                  frame: frame - cycDelay,
                  fps,
                  config: { damping: 14, mass: 0.5 },
                });
                return (
                  <div
                    key={label}
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.text,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: "6px 14px",
                      opacity: interpolate(cycProg, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(cycProg, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
