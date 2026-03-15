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

const crossedItems = [
  "IM Server",
  "MQ",
  "WebSocket",
];

export const SceneBaIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const heroTextProg = spring({ frame: frame - 30, fps, config: { damping: 12, mass: 0.8 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          极简后端
        </div>

        {/* Hero text */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          管容器，不管对话
        </div>

        {/* Crossed out items */}
        <div
          style={{
            display: "flex",
            gap: 40,
            opacity: interpolate(heroTextProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(heroTextProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {crossedItems.map((item, i) => {
            const delay = 35 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    color: COLORS.subtle,
                    textDecoration: "line-through",
                    textDecorationColor: COLORS.accent,
                    textDecorationThickness: 3,
                  }}
                >
                  {item}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tag */}
        {(() => {
          const tagProg = spring({
            frame: frame - 65,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: COLORS.accent,
                borderRadius: 12,
                padding: "14px 32px",
                boxShadow: "0 4px 24px rgba(218,119,86,0.2)",
                opacity: interpolate(tagProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(tagProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.white,
                }}
              >
                SQLite in Container
              </span>
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
