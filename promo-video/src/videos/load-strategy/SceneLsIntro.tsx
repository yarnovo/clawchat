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

export const SceneLsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

  const tags = ["加载顺序", "条件过滤", "截断策略"];

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
          加载策略
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
          从文件到系统提示词
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 12,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
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
