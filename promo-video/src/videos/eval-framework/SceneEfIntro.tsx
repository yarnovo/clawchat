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

export const SceneEfIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Agent 评估框架
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          不靠感觉，靠 DeepEval
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.white,
            background: COLORS.accent,
            padding: "10px 28px",
            borderRadius: 10,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
          }}
        >
          一个框架，覆盖三层
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
