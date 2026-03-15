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
  { num: "01", title: "上传合同", desc: "粘贴文本或发送文件" },
  { num: "02", title: "逐条扫描", desc: "AI 自动识别关键条款" },
  { num: "03", title: "风险标注", desc: "高/中/低三级风险标记" },
  { num: "04", title: "生成报告", desc: "结构化审查报告输出" },
];

export const SceneWorkflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四步完成审查
        </div>

        {/* Steps as horizontal flow */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {steps.map((s, i) => {
            const delay = 15 + i * 15;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div key={s.num} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    padding: "28px 32px",
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    width: 240,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 36,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {s.num}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: 30,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                      textAlign: "center",
                    }}
                  >
                    {s.desc}
                  </div>
                </div>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                    }}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
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
