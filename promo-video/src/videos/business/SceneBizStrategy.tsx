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

const phases = [
  { phase: "Phase 1", name: "聊天功能", desc: "吸引技术用户" },
  { phase: "Phase 2", name: "社交留存", desc: "100 活跃用户" },
  { phase: "Phase 3", name: "市场变现", desc: "月收入覆盖成本" },
];

export const SceneBizStrategy: React.FC = () => {
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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          渐进式披露
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {phases.map((p, i) => {
            const rowProg = spring({
              frame: frame - 12 - i * 10,
              fps,
              config: { damping: 12, mass: 0.8 },
            });
            return (
              <div
                key={p.phase}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "20px 32px",
                  borderRadius: 14,
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  minWidth: 520,
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [-40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.accent,
                    padding: "4px 12px",
                    borderRadius: 8,
                    backgroundColor: "rgba(218,119,86,0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.phase}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    marginLeft: "auto",
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
