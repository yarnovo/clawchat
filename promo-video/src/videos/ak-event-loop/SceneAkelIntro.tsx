import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const DOT_COUNT = 8;
const PIPE_Y = 480;
const PIPE_LEFT = 340;
const PIPE_RIGHT = 1580;
const PIPE_WIDTH = PIPE_RIGHT - PIPE_LEFT;

const dotColors = [
  COLORS.accent,
  "#5B8DEF",
  "#E8A838",
  "#6DC5A1",
  "#DA7756",
  "#9B7DD4",
  "#5B8DEF",
  "#E8A838",
];

export const SceneAkelIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const pipeProg = spring({ frame: frame - 30, fps, config: { damping: 16, mass: 1.2 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${titleScale}) translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Event Loop
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          纯事件总线
        </div>

        {/* Pipe / Tube with flowing dots */}
        <div
          style={{
            position: "relative",
            width: PIPE_WIDTH,
            height: 80,
            marginTop: 40,
            opacity: interpolate(pipeProg, [0, 1], [0, 1]),
            transform: `scaleX(${interpolate(pipeProg, [0, 1], [0.6, 1])})`,
          }}
        >
          {/* Pipe background */}
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 0,
              right: 0,
              height: 40,
              borderRadius: 20,
              background: `linear-gradient(180deg, ${COLORS.border} 0%, rgba(232,224,216,0.4) 100%)`,
              border: `1.5px solid ${COLORS.border}`,
            }}
          />

          {/* Pipe inner glow */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 4,
              right: 4,
              height: 32,
              borderRadius: 16,
              background: "rgba(255,255,255,0.6)",
            }}
          />

          {/* Arrow at the right end */}
          <div
            style={{
              position: "absolute",
              right: -20,
              top: 24,
              width: 0,
              height: 0,
              borderTop: "16px solid transparent",
              borderBottom: "16px solid transparent",
              borderLeft: `20px solid ${COLORS.muted}`,
              opacity: 0.5,
            }}
          />

          {/* Flowing dots */}
          {Array.from({ length: DOT_COUNT }).map((_, i) => {
            const speed = 3.5;
            const offset = random(`dot-offset-${i}`) * PIPE_WIDTH;
            const x = ((offset + frame * speed) % (PIPE_WIDTH + 40)) - 20;
            const dotSize = 16 + random(`dot-size-${i}`) * 8;
            const yOffset = (random(`dot-y-${i}`) - 0.5) * 12;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: 40 - dotSize / 2 + yOffset,
                  width: dotSize,
                  height: dotSize,
                  borderRadius: "50%",
                  backgroundColor: dotColors[i % dotColors.length],
                  opacity: 0.85,
                  boxShadow: `0 0 8px ${dotColors[i % dotColors.length]}40`,
                  transition: "none",
                }}
              />
            );
          })}
        </div>

        {/* Labels */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: PIPE_WIDTH,
            marginTop: 8,
            opacity: interpolate(pipeProg, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              color: COLORS.muted,
            }}
          >
            Events In
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              color: COLORS.muted,
            }}
          >
            Dispatch Out
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
