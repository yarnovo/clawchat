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

export const SceneSdIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const iconProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
  const tagProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  const icons = [
    { emoji: "\u23F0", label: "\u5B9A\u65F6\u6C47\u62A5" },
    { emoji: "\uD83D\uDCCA", label: "\u5B9A\u671F\u68C0\u67E5" },
    { emoji: "\uD83D\uDD14", label: "\u5230\u70B9\u63D0\u9192" },
  ];

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
          {"\u5B9A\u65F6\u4EFB\u52A1\u8BBE\u8BA1"}
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
          {"\u8BA9 Agent \u4ECE\u88AB\u52A8\u53D8\u4E3B\u52A8"}
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 16,
            opacity: interpolate(iconProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(iconProg, [0, 1], [0.7, 1])})`,
          }}
        >
          {icons.map((item, i) => {
            const d = spring({ frame: frame - 35 - i * 8, fps, config: { damping: 14 } });
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(d, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 56 }}>{item.emoji}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
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
          {"\u4E09\u5927 Claw Runtime \u5BF9\u6BD4"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
