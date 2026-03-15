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

export const SceneAkcsSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 12 } });
  const rightProg = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const centerProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const bottomProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
        {/* Title */}
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
          时间也是外部世界
        </div>

        {/* Convergence diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 16,
          }}
        >
          {/* Left source: HTTP */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 32px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-60, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              HTTP
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              HTTP 请求
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
              }}
            >
              用户 / Webhook
            </div>
          </div>

          {/* Arrow from left */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 36,
              color: COLORS.accent,
              padding: "0 20px",
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
            }}
          >
            →
          </div>

          {/* Center: EventLoop */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              background: COLORS.accent,
              borderRadius: 20,
              padding: "32px 48px",
              boxShadow: "0 4px 28px rgba(218,119,86,0.25)",
              opacity: interpolate(centerProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(centerProg, [0, 1], [0.7, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 700,
                color: COLORS.white,
                letterSpacing: 1,
              }}
            >
              EventLoop
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              统一入口
            </div>
          </div>

          {/* Arrow from right */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 36,
              color: COLORS.accent,
              padding: "0 20px",
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
            }}
          >
            ←
          </div>

          {/* Right source: cron */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 32px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [60, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              CRON
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              cron 定时
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
              }}
            >
              HEARTBEAT.md
            </div>
          </div>
        </div>

        {/* Bottom label */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: 4,
            opacity: interpolate(bottomProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(bottomProg, [0, 1], [20, 0])}px)`,
          }}
        >
          统一调度
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
