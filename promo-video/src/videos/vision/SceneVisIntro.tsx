import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT } from "../../constants";

export const SceneVisIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          你的 Agent
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          替全世界打工
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.muted,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          ClawChat 对 AI 时代的回答
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
