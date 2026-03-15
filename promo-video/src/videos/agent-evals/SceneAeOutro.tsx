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

const keywords = [
  { text: "自带 evals", desc: "20-50 条用例", color: COLORS.muted },
  { text: "DeepEval", desc: "一个框架 · 三层六指标", color: "#C4956A" },
  { text: "质量门槛", desc: "量化证据，非主观", color: COLORS.accent },
];

export const SceneAeOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const kwProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.7, 1])})`,
          }}
        >
          Eval-Driven Development
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          先写 eval 再开发
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
          {keywords.map((kw, i) => {
            const delay = 24 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={kw.text}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${kw.color}`,
                  borderRadius: 16,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 40px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 260,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: kw.color,
                  }}
                >
                  {kw.text}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                  }}
                >
                  {kw.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 28,
            color: COLORS.text,
            fontWeight: 600,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [12, 0])}px)`,
          }}
        >
          eval 是质量的量化证据，不是主观判断
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
