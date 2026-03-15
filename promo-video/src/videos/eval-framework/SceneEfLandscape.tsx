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

const generalTools = [
  { name: "promptfoo", stars: "4.5k" },
  { name: "DeepEval", stars: "4.2k" },
  { name: "RAGAS", stars: "7.8k" },
];

const agentTools = [
  { name: "AgentEvals", stars: "0.6k" },
  { name: "vitest-evals", stars: "1.2k" },
  { name: "LangWatch Scenario", stars: "0.3k" },
];

export const SceneEfLandscape: React.FC = () => {
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
          评估框架全景
        </div>

        <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>
          {/* General LLM Evaluation */}
          {[
            { title: "通用 LLM 评估", subtitle: "回答质量 + 安全性", tools: generalTools, borderColor: COLORS.muted },
            { title: "Agent 专用评估", subtitle: "工具调用 + 任务完成", tools: agentTools, borderColor: COLORS.accent },
          ].map((col, ci) => {
            const colDelay = 10 + ci * 16;
            const colProg = spring({ frame: frame - colDelay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={col.title}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${col.borderColor}`,
                  borderRadius: 18,
                  boxShadow: COLORS.cardShadow,
                  padding: "32px 44px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  minWidth: 380,
                  opacity: interpolate(colProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(colProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: ci === 1 ? COLORS.accent : COLORS.text,
                  }}
                >
                  {col.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    marginBottom: 8,
                  }}
                >
                  {col.subtitle}
                </div>
                {col.tools.map((tool, ti) => {
                  const toolDelay = colDelay + 10 + ti * 8;
                  const toolProg = spring({ frame: frame - toolDelay, fps, config: { damping: 14, mass: 0.5 } });
                  return (
                    <div
                      key={tool.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 20px",
                        borderRadius: 10,
                        background: `${col.borderColor}08`,
                        border: `1px solid ${COLORS.border}`,
                        opacity: interpolate(toolProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(toolProg, [0, 1], [-16, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 26,
                          fontWeight: 600,
                          color: COLORS.text,
                        }}
                      >
                        {tool.name}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 24,
                          color: COLORS.muted,
                        }}
                      >
                        {tool.stars}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
