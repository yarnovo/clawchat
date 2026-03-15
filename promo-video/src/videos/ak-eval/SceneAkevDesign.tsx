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

const scorers = [
  { name: "toolCorrectness", desc: "调了正确的工具？" },
  { name: "trajectoryMatch", desc: "调用顺序对不对？" },
  { name: "contentCheck", desc: "回复包含关键信息？" },
];

export const SceneAkevDesign: React.FC = () => {
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
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          三个评分器
        </div>

        {/* Scorer cards */}
        <div style={{ display: "flex", gap: 36 }}>
          {scorers.map((scorer, i) => {
            const delay = 16 + i * 12;
            const cardProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.7 },
            });

            return (
              <div
                key={scorer.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 20,
                  padding: "40px 36px",
                  minWidth: 300,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [40, 0])}px)`,
                }}
              >
                {/* Scorer name in MONO */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.accent,
                    textAlign: "center",
                  }}
                >
                  {scorer.name}
                </div>

                {/* Divider */}
                <div
                  style={{
                    width: 60,
                    height: 2,
                    background: COLORS.border,
                    borderRadius: 1,
                  }}
                />

                {/* Description in FONT_SANS */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 500,
                    color: COLORS.text,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {scorer.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
