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

const steps = [
  { label: "用户开聊", icon: "\uD83D\uDCAC", detail: "= 创建 Pod" },
  { label: "聊完", icon: "\u2713", detail: "= Pod 销毁" },
  { label: "1000 用户", icon: "\uD83D\uDC65", detail: "= 1000 Pod" },
  { label: "K8s 调度", icon: "\u2699", detail: "自动分配到不同机器" },
];

export const SceneK8sAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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
          {"K8s \u00D7 Agent 市场"}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          容器编排驱动 Agent 弹性调度
        </div>

        {/* 流程图：横向四步 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          {steps.map((s, i) => {
            const delay = 20 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isLast = i === steps.length - 1;
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 260,
                    padding: "28px 20px",
                    borderRadius: 16,
                    background: isLast ? COLORS.accent : COLORS.card,
                    border: `1px solid ${isLast ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 40, lineHeight: 1 }}>{s.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: isLast ? COLORS.white : COLORS.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: isLast ? "rgba(255,255,255,0.8)" : COLORS.muted,
                    }}
                  >
                    {s.detail}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
