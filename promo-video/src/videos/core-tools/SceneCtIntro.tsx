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

export const SceneCtIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const tags = ["生存", "进化", "协作"];

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent 工具箱
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 160,
            fontWeight: 800,
            color: COLORS.accent,
            lineHeight: 1,
            transform: `scale(${numProg})`,
          }}
        >
          13
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          三层架构
        </div>

        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 8,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.accent,
                padding: "10px 28px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
