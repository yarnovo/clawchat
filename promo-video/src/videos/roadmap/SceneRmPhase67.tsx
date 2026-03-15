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

const phases = [
  {
    phase: "Phase 6",
    title: "体验打磨",
    desc: "推送/深色模式/搜索",
  },
  {
    phase: "Phase 7",
    title: "商业化",
    desc: "Agent市场/订阅/分成",
  },
];

export const SceneRmPhase67: React.FC = () => {
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
          gap: 40,
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Phase 6-7（远期）
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: 40 }}>
          {phases.map((p, i) => {
            const delay = 15 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={p.phase}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  width: 420,
                  padding: "36px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 500,
                    color: COLORS.muted,
                    letterSpacing: 2,
                  }}
                >
                  {p.phase}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 34,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
