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

const TAGS = ["SaaS", "Marketplace", "双向激励"];

export const SceneBizIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });

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
        <div style={{ transform: `scale(${iconScale})`, fontSize: 100 }}>
          💰
        </div>

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
          商业模式
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          订阅 + 市场分成
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 16,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {TAGS.map((tag, i) => {
            const tagProg = spring({
              frame: frame - 35 - i * 5,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={tag}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.accent,
                  padding: "8px 20px",
                  borderRadius: 20,
                  border: `1px solid ${COLORS.border}`,
                  backgroundColor: COLORS.card,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
