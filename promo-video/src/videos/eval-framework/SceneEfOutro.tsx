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

const highlights = [
  { value: "1", unit: "个框架", desc: "覆盖三层" },
  { value: "6", unit: "个指标", desc: "Agent 专精" },
  { value: "12.8k", unit: "stars", desc: "最大社区" },
];

export const SceneEfOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const bridgeProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          不靠感觉，靠 DeepEval
        </div>

        {/* Stats cards */}
        <div style={{ display: "flex", gap: 36 }}>
          {highlights.map((h, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={h.desc}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${COLORS.accent}`,
                  borderRadius: 18,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 40px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 200,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 44,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {h.value}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      color: COLORS.muted,
                    }}
                  >
                    {h.unit}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.text,
                  }}
                >
                  {h.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bridge description */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.6,
            opacity: interpolate(bridgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(bridgeProg, [0, 1], [16, 0])}px)`,
          }}
        >
          Python 写评估 · TypeScript 写 Agent · JSON 做桥梁
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.accent,
            fontWeight: 600,
            textAlign: "center",
            marginTop: 4,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          DeepEval
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
