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

export const SceneAeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const numProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const tagProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
          Agent 评估设计
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
          每个 Agent 自带 evals
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.accent,
            opacity: interpolate(numProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numProg, [0, 1], [0.6, 1])})`,
          }}
        >
          20 - 50 条用例
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            padding: "10px 28px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagProg, [0, 1], [16, 0])}px)`,
          }}
        >
          从真实场景提取 · 上架硬性门槛
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
