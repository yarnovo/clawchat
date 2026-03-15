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
  { icon: "📥", label: "Redis 队列" },
  { icon: "⚙️", label: "Worker 消费" },
  { icon: "📡", label: "WebSocket 推送" },
];

export const SceneMsgPush: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          异步推送
        </div>

        {/* Horizontal pipeline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {stages.map((stage, i) => {
            const stageProg = spring({
              frame: frame - 12 - i * 14,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={stage.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: interpolate(stageProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(stageProg, [0, 1], [40, 0])}px)`,
                }}
              >
                {/* Arrow before (except first) */}
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      color: COLORS.subtle,
                      padding: "0 16px",
                    }}
                  >
                    →
                  </div>
                )}

                {/* Stage card */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    background: COLORS.card,
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    padding: "28px 36px",
                    minWidth: 220,
                  }}
                >
                  <div style={{ fontSize: 48 }}>{stage.icon}</div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                      textAlign: "center",
                    }}
                  >
                    {stage.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [15, 0])}px)`,
          }}
        >
          高并发下保证可靠性
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
