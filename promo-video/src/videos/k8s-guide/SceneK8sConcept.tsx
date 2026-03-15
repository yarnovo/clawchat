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

const concepts = [
  { name: "Pod", icon: "\u25A3", desc: "最小单位", detail: "一个或几个容器的组合" },
  { name: "Service", icon: "\u21C6", desc: "入口", detail: "把外部流量导到 Pod" },
  { name: "Deployment", icon: "\u2699", desc: "管理器", detail: "管 Pod 数量和镜像" },
  { name: "Node", icon: "\u2630", desc: "机器", detail: "Pod 跑在 Node 上" },
];

export const SceneK8sConcept: React.FC = () => {
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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四个核心概念
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {concepts.map((c, i) => {
            const delay = 12 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={c.name}
                style={{
                  width: 280,
                  padding: "32px 24px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 48, lineHeight: 1 }}>{c.icon}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 34,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {c.desc}
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
                  {c.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
