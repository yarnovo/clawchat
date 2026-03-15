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

const summary = [
  { layer: "L1 单元", guarantee: "模块正确", color: COLORS.muted },
  { layer: "L2 集成", guarantee: "流程正确", color: "#C4956A" },
  { layer: "L3 E2E", guarantee: "真实可用", color: COLORS.accent },
];

export const SceneTaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const gridProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
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
          gap: 32,
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
          三层测试总结
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(gridProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(gridProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {summary.map((s, i) => {
            const delay = 18 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={s.layer}
                style={{
                  padding: "28px 44px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `2px solid ${s.color}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 240,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: s.color,
                  }}
                >
                  {s.layer}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {s.guarantee}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.accent,
            fontWeight: 600,
            textAlign: "center",
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          代码量少 · Mock LLM 核心技巧 · 覆盖率容易拉满
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
