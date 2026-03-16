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

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Counter animation: 0 → 85
  const counterProg = spring({ frame, fps, config: { damping: 20, mass: 1.2 } });
  const count = Math.round(interpolate(counterProg, [0, 1], [0, 85]));

  const titleProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        {/* Big counter */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 160,
            fontWeight: 700,
            color: COLORS.accent,
            lineHeight: 1,
          }}
        >
          {count}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          个视频，一套框架
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [15, 0])}px)`,
            letterSpacing: 6,
          }}
        >
          Remotion + Edge TTS + React
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
