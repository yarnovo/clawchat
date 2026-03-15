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
  { label: "L3", name: "端到端场景", tool: "Scenario", color: COLORS.accent, width: 380 },
  { label: "L2", name: "完整轨迹", tool: "agentevals", color: "#C4956A", width: 560 },
  { label: "L1", name: "工具调用", tool: "vitest-evals", color: COLORS.muted, width: 760 },
];

export const SceneEfOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          三层评估金字塔
        </div>

        {/* Pyramid layers */}
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
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text,
                  minWidth: 160,
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
                {layer.tool}
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.accent,
            fontWeight: 600,
            textAlign: "center",
            marginTop: 8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          全部 TypeScript · 零 Python
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
