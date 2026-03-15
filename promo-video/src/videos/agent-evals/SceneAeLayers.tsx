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
    label: "L3",
    name: "端到端",
    tool: "TaskCompletion + GEval",
    desc: "完整任务完成度评估",
    color: COLORS.accent,
    width: 480,
  },
  {
    label: "L2",
    name: "轨迹层",
    tool: "ToolUse + Orchestration",
    desc: "完整调用链 + 编排顺序",
    color: "#C4956A",
    width: 640,
  },
  {
    label: "L1",
    name: "工具调用",
    tool: "ToolCorrectness + Argument",
    desc: "单次工具名 + 参数验证",
    color: COLORS.muted,
    width: 780,
  },
];

export const SceneAeLayers: React.FC = () => {
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
          gap: 24,
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
          DeepEval 三层六指标
        </div>

        {layers.map((layer, i) => {
          const delay = 14 + i * 14;
          const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <div
              key={layer.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                width: layer.width,
                padding: "22px 32px",
                borderRadius: 14,
                background: COLORS.card,
                border: `2px solid ${layer.color}`,
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 30,
                  fontWeight: 700,
                  color: layer.color,
                  minWidth: 48,
                }}
              >
                {layer.label}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  flex: 1,
                }}
              >
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
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: layer.color,
                  whiteSpace: "nowrap",
                }}
              >
                {layer.tool}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
