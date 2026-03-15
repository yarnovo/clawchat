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
  { label: "App", sub: "containers/run", zone: "client" },
  { label: "Backend", sub: "docker run", zone: "backend" },
  { label: "Container", sub: "Channel HTTP", zone: "container" },
  { label: "App", sub: "SSE direct", zone: "client" },
];

export const SceneBaFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  const zoneColor = (zone: string) => {
    if (zone === "backend") return COLORS.accent;
    if (zone === "container") return "#B05A35";
    return COLORS.card;
  };

  const zoneTextColor = (zone: string) => {
    if (zone === "backend" || zone === "container") return COLORS.white;
    return COLORS.text;
  };

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
          开聊链路
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          App {"\u2192"} Backend(run) {"\u2192"} Container(Channel HTTP) {"\u2192"} App 直连
        </div>

        {/* Flow steps */}
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
            const delay = 20 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const bg = zoneColor(step.zone);
            const textColor = zoneTextColor(step.zone);
            const isColored = step.zone === "backend" || step.zone === "container";
            return (
              <div
                key={`${step.label}-${i}`}
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
                    background: bg,
                    border: isColored ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: "22px 32px",
                    boxShadow: isColored
                      ? "0 4px 24px rgba(218,119,86,0.2)"
                      : COLORS.cardShadow,
                    minWidth: 160,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 700,
                      color: textColor,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 17,
                      color: isColored ? "rgba(255,255,255,0.8)" : COLORS.muted,
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
                      padding: "0 14px",
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

        {/* Key insight */}
        {(() => {
          const insightProg = spring({
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
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "16px 36px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(insightProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(insightProg, [0, 1], [20, 0])}px)`,
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
                Key:
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.text,
                }}
              >
                后端只负责启动容器，对话直接 App {"\u2194"} Container
              </div>
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
