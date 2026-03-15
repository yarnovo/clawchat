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

const steps = [
  { num: "1", title: "minikube", desc: "开发" },
  { num: "2", title: "k3s 单机", desc: "生产" },
  { num: "3", title: "k3s 多节点", desc: "扩容" },
  { num: "4", title: "K8s 集群", desc: "规模化" },
];

export const SceneKdPath: React.FC = () => {
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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          渐进路径
        </div>

        {/* 路径图 */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {steps.map((s, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const arrowProg = spring({ frame: frame - delay - 4, fps, config: { damping: 14 } });
            const isRecommended = i === 1;
            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 280,
                    padding: "28px 24px",
                    borderRadius: 16,
                    background: COLORS.card,
                    border: isRecommended ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      background: isRecommended ? COLORS.accent : COLORS.border,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: isRecommended ? COLORS.white : COLORS.text,
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: isRecommended ? COLORS.accent : COLORS.text,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                    }}
                  >
                    {s.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      color: COLORS.subtle,
                      margin: "0 12px",
                      opacity: interpolate(arrowProg, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          每一步都不需要重写代码
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
