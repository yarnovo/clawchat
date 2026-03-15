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

const tiers = [
  { label: "toolCorrectness", color: COLORS.accent },
  { label: "trajectoryMatch", color: COLORS.muted },
  { label: "contentCheck", color: COLORS.text },
];

export const SceneAkevIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

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
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Eval Framework
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 的考试系统 — 按类型评分
        </div>

        {/* Tier badges stacked, fade in bottom to top */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          {[...tiers].reverse().map((tier, reverseIdx) => {
            // bottom to top: L3 appears first (reverseIdx=0), then L2, then L1
            const delay = 24 + reverseIdx * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            // Re-reverse to display L1 on top, L2 middle, L3 bottom
            const displayIdx = tiers.length - 1 - reverseIdx;
            const t = tiers[displayIdx];

            return (
              <div
                key={t.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 56px",
                  borderRadius: 40,
                  border: `2px solid ${COLORS.border}`,
                  background: COLORS.card,
                  boxShadow: COLORS.cardShadow,
                  minWidth: 260,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: t.color,
                    letterSpacing: 2,
                  }}
                >
                  {t.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
