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

export const ScenePpIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const footProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [40, 0])}px) scale(${interpolate(titleProg, [0, 1], [0.8, 1])})`,
          }}
        >
          上门卸载
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 40,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          不是安装，是卸载
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            fontWeight: 400,
            color: COLORS.muted,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footProg, [0, 1], [20, 0])}px)`,
          }}
        >
          这背后的痛点，值得深思
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
