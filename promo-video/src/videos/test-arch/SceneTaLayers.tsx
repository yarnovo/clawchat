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
    name: "E2E",
    desc: "百炼 API",
    color: COLORS.accent,
    width: 360,
  },
  {
    label: "L2",
    name: "集成测试",
    desc: "Mock LLM",
    color: "#C4956A",
    width: 560,
  },
  {
    label: "L1",
    name: "单元测试",
    desc: "session / persona / tools",
    color: COLORS.muted,
    width: 780,
  },
];

export const SceneTaLayers: React.FC = () => {
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
          gap: 20,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            marginBottom: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          测试金字塔
        </div>

        {layers.map((layer, i) => {
          const delay = 12 + i * 14;
          const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <div
              key={layer.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
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
                  fontSize: 28,
                  fontWeight: 700,
                  color: layer.color,
                  minWidth: 50,
                }}
              >
                {layer.label}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 600,
                  color: COLORS.text,
                  minWidth: 140,
                }}
              >
                {layer.name}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: COLORS.muted,
                }}
              >
                {layer.desc}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
