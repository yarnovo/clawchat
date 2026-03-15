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
  { label: "用户模拟器", desc: "多轮对话", color: "#7B8EC4" },
  { label: "Agent", desc: "执行任务", color: COLORS.accent },
  { label: "Judge Agent", desc: "自动评分", color: "#5A9E6F" },
];

const dslLines = [
  { text: "scenario:", indent: 0 },
  { text: 'name: "查询天气"', indent: 1 },
  { text: "user_says:", indent: 1 },
  { text: '- "北京今天天气怎么样"', indent: 2 },
  { text: "agent_should:", indent: 1 },
  { text: '- call: "get_weather"', indent: 2 },
  { text: "success_when:", indent: 1 },
  { text: '- reply_contains: "温度"', indent: 2 },
];

export const SceneEfL3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.7 } });
  const dslProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
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
          L3 · LangWatch Scenario
        </div>

        {/* Flow diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [24, 0])}px)`,
          }}
        >
          {flowSteps.map((step, i) => {
            const delay = 16 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isLast = i === flowSteps.length - 1;
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
                    padding: "24px 36px",
                    borderRadius: 16,
                    background: COLORS.card,
                    border: `2px solid ${step.color}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 180,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: step.color,
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
                {!isLast && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 36,
                      color: COLORS.subtle,
                      margin: "0 16px",
                    }}
                  >
                    {">"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* DSL block */}
        <div
          style={{
            background: "#1E1E1E",
            borderRadius: 16,
            padding: "28px 44px",
            boxShadow: "0 4px 30px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 520,
            opacity: interpolate(dslProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(dslProg, [0, 1], [0.95, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: "#808080",
              marginBottom: 8,
            }}
          >
            声明式 DSL
          </div>
          {dslLines.map((line, i) => {
            const lineDelay = 44 + i * 3;
            const lineProg = spring({ frame: frame - lineDelay, fps, config: { damping: 14, mass: 0.4 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: line.text.startsWith("-") ? "#9CDCFE" : line.text.includes(":") ? "#CE9178" : "#D4D4D4",
                  paddingLeft: line.indent * 28,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [-8, 0])}px)`,
                  minHeight: 30,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
