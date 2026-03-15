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

export const SceneAtIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const yearProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 24, fps, config: { damping: 14 } });
  const lineProg = spring({ frame: frame - 36, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 140,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: -4,
            transform: `scale(${yearProg})`,
            lineHeight: 1,
          }}
        >
          2026
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: 4,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          AI 趋势全景
        </div>

        <div
          style={{
            width: 120,
            height: 3,
            background: COLORS.accent,
            opacity: interpolate(lineProg, [0, 1], [0, 0.6]),
            transform: `scaleX(${lineProg})`,
          }}
        />

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 8,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          从能力展示到规模落地
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
