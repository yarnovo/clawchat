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

export const SceneApIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const accentProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const descProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(accentProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(accentProg, [0, 1], [20, 0])}px)`,
          }}
        >
          替全世界打工
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 400,
            color: COLORS.muted,
            opacity: interpolate(descProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          每个人都能拥有自己的 AI Agent 团队
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
