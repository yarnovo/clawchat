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
  { label: "生成假设", desc: "AI 自主提出研究方向" },
  { label: "控制实验", desc: "操作实验设备和仪器" },
  { label: "分析发现", desc: "与研究员协作验证" },
];

export const SceneAtScience: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const highlightProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          AI 科学家
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {steps.map((s, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    padding: "28px 32px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: COLORS.accent,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted, textAlign: "center", maxWidth: 180 }}>
                    {s.desc}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(highlightProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(highlightProg, [0, 1], [10, 0])}px)`,
          }}
        >
          AlphaEvolve — 推进复杂度理论前沿
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
