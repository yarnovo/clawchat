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
  { label: "开发", desc: "跑 eval 验证效果", color: COLORS.muted },
  { label: "上架", desc: "平台自动跑全部 eval", color: "#7B8EC4" },
  { label: "通过", desc: "发布到市场", color: "#5A9E6F" },
  { label: "打回", desc: "不过不能发布", color: "#B05A5A" },
];

const forkSteps = [
  { label: "Fork", desc: "基于原 Agent 修改" },
  { label: "Eval", desc: "必须通过原始 eval" },
  { label: "上架", desc: "审核去重 + 质量门槛" },
];

export const SceneAeGate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const forkTitleProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          评估即门槛
        </div>

        {/* Main flow */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {steps.map((s, i) => {
            const delay = 10 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isPass = s.label === "通过";
            const isFail = s.label === "打回";
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {i > 0 && !isFail && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
                {isFail && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: "rotate(90deg)",
                      marginLeft: -60,
                    }}
                  >
                    {"\u2193"}
                  </div>
                )}
                <div
                  style={{
                    background: COLORS.card,
                    border: `2px solid ${s.color}`,
                    borderRadius: 14,
                    boxShadow: COLORS.cardShadow,
                    padding: "20px 32px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 180,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: isFail
                      ? `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`
                      : `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 30,
                      fontWeight: 700,
                      color: isPass ? "#5A9E6F" : isFail ? "#B05A5A" : COLORS.text,
                    }}
                  >
                    {s.label}
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
              </div>
            );
          })}
        </div>

        {/* Fork flow */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(forkTitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(forkTitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          Fork 后也要过 eval
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {forkSteps.map((s, i) => {
            const delay = 60 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
                  </div>
                )}
                <div
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    boxShadow: COLORS.cardShadow,
                    padding: "16px 28px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 200,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [16, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.label}
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
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
