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
  "Agent 容器 callback",
  "Redis 队列",
  "Worker 消费",
  "写入数据库",
  "WebSocket 推送",
];

export const SceneImwWorker: React.FC = () => {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent Reply Worker
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {steps.map((step, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={step}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      color: COLORS.accent,
                      lineHeight: "36px",
                    }}
                  >
                    ↓
                  </div>
                )}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    padding: "14px 36px",
                    borderRadius: 12,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    minWidth: 320,
                    textAlign: "center",
                  }}
                >
                  {step}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
