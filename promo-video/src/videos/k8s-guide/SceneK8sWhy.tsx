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

const scenarios = [
  { problem: "容器挂了", arrow: "\u2192", solution: "自动重启", icon: "\u21BB" },
  { problem: "流量暴增", arrow: "\u2192", solution: "自动扩容", icon: "\u2191" },
  { problem: "机器挂了", arrow: "\u2192", solution: "自动迁移", icon: "\u21C4" },
];

export const SceneK8sWhy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          为什么需要 K8s
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          三个字：自动化
        </div>

        <div style={{ display: "flex", gap: 40, marginTop: 12 }}>
          {scenarios.map((s, i) => {
            const delay = 18 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={s.problem}
                style={{
                  width: 340,
                  padding: "36px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 44, lineHeight: 1 }}>{s.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {s.problem}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    color: COLORS.subtle,
                  }}
                >
                  {s.arrow}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {s.solution}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
