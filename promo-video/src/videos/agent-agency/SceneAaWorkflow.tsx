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
  "客户需求",
  "Claude Code\n定制",
  "配\nCLAUDE.md",
  "配 Skills",
  "配定时\n任务",
  "连渠道",
  "部署",
  "客户使用",
];

export const SceneAaWorkflow: React.FC = () => {
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
          交付流程
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1400,
          }}
        >
          {steps.map((step, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isLast = i === steps.length - 1;
            const isFirst = i === 0;
            return (
              <div key={step} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    padding: "20px 24px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: isFirst || isLast ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minWidth: 120,
                    minHeight: 80,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isFirst || isLast ? COLORS.accent : COLORS.text,
                      textAlign: "center",
                      whiteSpace: "pre-line",
                      lineHeight: 1.4,
                    }}
                  >
                    {step}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      margin: "0 8px",
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
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
