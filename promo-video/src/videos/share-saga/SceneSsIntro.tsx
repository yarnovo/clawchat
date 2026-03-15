import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

export const SceneSsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  const tags = ["分布式事务", "补偿模式", "最终一致性"];

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
          Saga 模式实战
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          分布式系统的优雅补偿
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
            marginTop: 12,
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag}
              style={{
                fontFamily: MONO,
                fontSize: 28,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
