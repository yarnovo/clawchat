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

const layers = [
  {
    label: "L1",
    name: "工具调用",
    metrics: "ToolCorrectness + ArgumentCorrectness",
    desc: "对比实际调用和期望工具",
    color: COLORS.accent,
  },
  {
    label: "L2",
    name: "轨迹评估",
    metrics: "ToolUse + PlanQuality",
    desc: "评完整调用链",
    color: "#7B8EC4",
  },
  {
    label: "L3",
    name: "端到端",
    metrics: "TaskCompletion + G-Eval",
    desc: "LLM 裁判评分",
    color: "#5A9E6F",
  },
];

export const SceneEfLayers: React.FC = () => {
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
          三层评估，全部 DeepEval
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            alignItems: "stretch",
          }}
        >
          {layers.map((layer, i) => {
            const delay = 12 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={layer.label}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${layer.color}`,
                  borderRadius: 18,
                  boxShadow: COLORS.cardShadow,
                  padding: "32px 36px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  width: 340,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Layer badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.white,
                      background: layer.color,
                      padding: "6px 16px",
                      borderRadius: 8,
                    }}
                  >
                    {layer.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {layer.name}
                  </div>
                </div>

                {/* Metrics */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: layer.color,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: `${layer.color}10`,
                    border: `1px solid ${layer.color}30`,
                  }}
                >
                  {layer.metrics}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {layer.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
