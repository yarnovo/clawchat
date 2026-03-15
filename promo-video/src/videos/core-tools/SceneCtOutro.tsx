import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const layers = [
  { label: "协作", count: 3, color: "#7C5CBF", width: 320 },
  { label: "进化", count: 5, color: "#5B8DEF", width: 480 },
  { label: "生存", count: 5, color: COLORS.accent, width: 640 },
];

export const SceneCtOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const summaryProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 16,
          }}
        >
          三层金字塔
        </div>

        {/* Pyramid: top to bottom = small to wide */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {layers.map((layer, i) => {
            const delay = 10 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            return (
              <div
                key={layer.label}
                style={{
                  width: layer.width,
                  padding: "20px 0",
                  borderRadius: 14,
                  background: layer.color,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scaleX(${interpolate(prog, [0, 1], [0, 1])})`,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.white,
                  }}
                >
                  {layer.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {layer.count} 个工具
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.text,
            marginTop: 20,
            opacity: interpolate(summaryProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(summaryProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <span style={{ color: COLORS.accent }}>5</span> +{" "}
          <span style={{ color: "#5B8DEF" }}>5</span> +{" "}
          <span style={{ color: "#7C5CBF" }}>3</span> ={" "}
          <span style={{ fontSize: 44, color: COLORS.accent }}>13</span>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(summaryProg, [0, 1], [0, 1]),
          }}
        >
          一个能自我进化的 Agent
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
