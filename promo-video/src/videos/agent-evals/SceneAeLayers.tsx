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
    name: "场景层",
    tool: "LangWatch Scenario",
    desc: "多轮对话 + Judge Agent",
    color: COLORS.accent,
    width: 420,
  },
  {
    label: "L2",
    name: "轨迹层",
    tool: "agentevals",
    desc: "完整调用链匹配",
    color: "#C4956A",
    width: 600,
  },
  {
    label: "L1",
    name: "单元层",
    tool: "ToolCallScorer",
    desc: "单次工具调用验证",
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
          三层评估金字塔
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
