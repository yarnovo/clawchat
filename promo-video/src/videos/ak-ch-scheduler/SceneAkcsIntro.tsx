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

export const SceneAkcsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const clockProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const fileProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  // Clock hand rotation: slow ticking, one tick per ~20 frames
  const tickAngle = Math.floor(frame / 20) * 30; // 30 degrees per tick (12 positions)
  const smoothAngle = interpolate(
    frame % 20,
    [0, 3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const handRotation = tickAngle + smoothAngle * 30;

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 76,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Scheduler Channel
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 的时间感知
        </div>

        {/* Clock icon */}
        <div
          style={{
            position: "relative",
            width: 180,
            height: 180,
            marginTop: 20,
            opacity: interpolate(clockProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(clockProg, [0, 1], [0.7, 1])})`,
          }}
        >
          {/* Clock face */}
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: COLORS.card,
              border: `3px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              position: "relative",
            }}
          >
            {/* Hour marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = i * 30;
              const rad = (angle * Math.PI) / 180;
              const cx = 90 + Math.sin(rad) * 72;
              const cy = 90 - Math.cos(rad) * 72;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: cx - 3,
                    top: cy - 3,
                    width: i % 3 === 0 ? 8 : 5,
                    height: i % 3 === 0 ? 8 : 5,
                    borderRadius: "50%",
                    backgroundColor: i % 3 === 0 ? COLORS.text : COLORS.subtle,
                  }}
                />
              );
            })}

            {/* Clock hand (minute) */}
            <div
              style={{
                position: "absolute",
                left: 87,
                top: 30,
                width: 6,
                height: 62,
                borderRadius: 3,
                backgroundColor: COLORS.accent,
                transformOrigin: "3px 60px",
                transform: `rotate(${handRotation}deg)`,
              }}
            />

            {/* Center dot */}
            <div
              style={{
                position: "absolute",
                left: 82,
                top: 82,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: COLORS.accent,
              }}
            />
          </div>
        </div>

        {/* HEARTBEAT.md file card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "16px 32px",
            boxShadow: COLORS.cardShadow,
            marginTop: 8,
            opacity: interpolate(fileProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(fileProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              fontWeight: 600,
              color: COLORS.accent,
            }}
          >
            HEARTBEAT.md
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              color: COLORS.muted,
            }}
          >
            cron 定时触发
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
