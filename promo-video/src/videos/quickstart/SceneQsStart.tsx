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

const stages = [
  { status: "created", desc: "点击启动", highlight: false },
  { status: "starting...", desc: "容器初始化", highlight: false },
  { status: "running ✓", desc: "Agent 上线", highlight: true },
];

export const SceneQsStart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: 4,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(labelProg, [0, 1], [20, 0])}px)`,
          }}
        >
          STEP 3
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          启动 Agent
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: 12,
          }}
        >
          {stages.map((stage, i) => {
            const delay = 18 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={stage.status}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: stage.highlight ? COLORS.accent : COLORS.text,
                    padding: "12px 24px",
                    borderRadius: 10,
                    background: COLORS.card,
                    border: `1px solid ${stage.highlight ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    minWidth: 220,
                    textAlign: "center" as const,
                  }}
                >
                  {stage.status}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                  }}
                >
                  {stage.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
