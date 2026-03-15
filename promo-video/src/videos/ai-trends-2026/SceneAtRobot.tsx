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

const robots = [
  { name: "Optimus V3", org: "Tesla", highlight: "百万台年产能" },
  { name: "Helix 02", org: "Figure AI", highlight: "全身自主控制" },
  { name: "H1/G1", org: "Unitree", highlight: "万台级出货" },
  { name: "Atlas", org: "Boston Dynamics", highlight: "量产部署" },
];

export const SceneAtRobot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
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
          gap: 40,
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
          具身智能 · 人形机器人
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {robots.map((r, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={r.name}
                style={{
                  width: 220,
                  padding: "28px 20px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: COLORS.accent,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {r.org[0]}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.text, textAlign: "center" }}>
                  {r.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, textAlign: "center" }}>
                  {r.org}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: `${COLORS.accent}12`,
                    textAlign: "center",
                  }}
                >
                  {r.highlight}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          2026：从 Demo 到真实工业与服务场景
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
