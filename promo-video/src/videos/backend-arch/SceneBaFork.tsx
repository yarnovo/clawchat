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

const forkSteps = [
  { label: "Container A", sub: "running state", icon: "A" },
  { label: "docker commit", sub: "save as image", icon: "C" },
  { label: "New Image", sub: "with all state", icon: "I" },
  { label: "docker run", sub: "start new", icon: "R" },
  { label: "Container B", sub: "inherited all", icon: "B" },
];

const inheritedItems = [
  "聊天历史",
  "记忆文件",
  "安装的技能",
];

export const SceneBaFork: React.FC = () => {
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
          Fork 链路
        </div>

        {/* Fork flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {forkSteps.map((step, i) => {
            const delay = 18 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isCommand = i === 1 || i === 3;
            const isContainer = i === 0 || i === 4;
            const bgColor = isContainer ? COLORS.accent : isCommand ? "#B05A35" : COLORS.card;
            const txtColor = isContainer || isCommand ? COLORS.white : COLORS.text;
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
                    gap: 8,
                    background: bgColor,
                    border: isContainer || isCommand ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "18px 22px",
                    boxShadow: isContainer || isCommand
                      ? "0 4px 24px rgba(218,119,86,0.2)"
                      : COLORS.cardShadow,
                    minWidth: 130,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                      color: isContainer || isCommand ? "rgba(255,255,255,0.8)" : COLORS.accent,
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      fontWeight: 600,
                      color: txtColor,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      color: isContainer || isCommand ? "rgba(255,255,255,0.7)" : COLORS.muted,
                    }}
                  >
                    {step.sub}
                  </div>
                </div>
                {i < forkSteps.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.accent,
                      padding: "0 10px",
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

        {/* Inherited items */}
        <div
          style={{
            display: "flex",
            gap: 24,
          }}
        >
          {inheritedItems.map((item, i) => {
            const prog = spring({
              frame: frame - 70 - i * 8,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(218,119,86,0.08)",
                  borderRadius: 10,
                  padding: "12px 24px",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: COLORS.accent,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.text,
                    fontWeight: 500,
                  }}
                >
                  {item}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
