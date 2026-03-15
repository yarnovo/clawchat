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

const reasons = [
  {
    name: "Promptfoo",
    issue: "被 OpenAI 收购，独立性风险",
    color: "#B05A5A",
  },
  {
    name: "LangSmith",
    issue: "绑定 LangChain，需要付费",
    color: "#C4956A",
  },
  {
    name: "三框架组合",
    issue: "维护成本高，集成复杂",
    color: COLORS.muted,
  },
];

export const SceneEfWhy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const deepevalProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          为什么选 DeepEval
        </div>

        {/* Rejected alternatives */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {reasons.map((r, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={r.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "20px 36px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `2px solid ${r.color}`,
                  boxShadow: COLORS.cardShadow,
                  minWidth: 700,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                }}
              >
                {/* Cross icon */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: r.color,
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {"\u2717"}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                    minWidth: 200,
                  }}
                >
                  {r.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                  }}
                >
                  {r.issue}
                </div>
              </div>
            );
          })}
        </div>

        {/* DeepEval highlight */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "24px 44px",
            borderRadius: 16,
            background: `${COLORS.accent}10`,
            border: `3px solid ${COLORS.accent}`,
            boxShadow: "0 4px 30px rgba(218, 119, 86, 0.15)",
            minWidth: 700,
            opacity: interpolate(deepevalProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(deepevalProg, [0, 1], [0.9, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 700,
              color: "#5A9E6F",
              minWidth: 36,
              textAlign: "center",
            }}
          >
            {"\u2713"}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.accent,
              minWidth: 200,
            }}
          >
            DeepEval
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.text,
            }}
          >
            单框架全覆盖，开源免费，社区最大
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
