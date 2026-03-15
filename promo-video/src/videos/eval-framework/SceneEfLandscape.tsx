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

const frameworks = [
  { name: "Promptfoo", l1: false, l2: false, l3: false, note: "被 OpenAI 收购，偏安全红队" },
  { name: "vitest-evals", l1: true, l2: false, l3: false, note: "只覆盖工具调用" },
  { name: "agentevals", l1: false, l2: true, l3: false, note: "只覆盖轨迹" },
  { name: "LangWatch", l1: false, l2: false, l3: true, note: "只覆盖端到端" },
  { name: "DeepEval", l1: true, l2: true, l3: true, note: "全覆盖", highlight: true },
];

const CHECK = "\u2713";
const CROSS = "\u2717";

export const SceneEfLandscape: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.7 } });

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
          框架覆盖对比
        </div>

        <div
          style={{
            background: COLORS.card,
            borderRadius: 18,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(tableProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tableProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              borderBottom: `2px solid ${COLORS.border}`,
              background: `${COLORS.bg}`,
            }}
          >
            {["框架", "L1 工具", "L2 轨迹", "L3 端到端"].map((h, hi) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 700,
                  color: COLORS.text,
                  padding: "18px 32px",
                  width: hi === 0 ? 280 : 160,
                  textAlign: hi === 0 ? "left" : "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {frameworks.map((fw, i) => {
            const rowDelay = 18 + i * 10;
            const rowProg = spring({ frame: frame - rowDelay, fps, config: { damping: 14, mass: 0.5 } });
            const isHighlight = fw.highlight;
            return (
              <div
                key={fw.name}
                style={{
                  display: "flex",
                  borderBottom: i < frameworks.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  background: isHighlight ? `${COLORS.accent}10` : "transparent",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [-12, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: isHighlight ? 700 : 500,
                    color: isHighlight ? COLORS.accent : COLORS.text,
                    padding: "16px 32px",
                    width: 280,
                  }}
                >
                  {fw.name}
                </div>
                {[fw.l1, fw.l2, fw.l3].map((v, vi) => (
                  <div
                    key={vi}
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: v ? "#5A9E6F" : COLORS.subtle,
                      padding: "16px 32px",
                      width: 160,
                      textAlign: "center",
                    }}
                  >
                    {v ? CHECK : CROSS}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
