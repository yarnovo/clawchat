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

export const SceneBizMarketplace: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const splitProg = spring({ frame: frame - 12, fps, config: { damping: 12 } });
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
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          市场分成
        </div>

        <div
          style={{
            display: "flex",
            gap: 80,
            alignItems: "center",
            opacity: interpolate(splitProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(splitProg, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              生产者
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 80,
                fontWeight: 800,
                color: COLORS.accent,
              }}
            >
              80%
            </div>
          </div>

          <div
            style={{
              width: 2,
              height: 120,
              backgroundColor: COLORS.border,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              平台
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 80,
                fontWeight: 800,
                color: COLORS.muted,
              }}
            >
              20%
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(descProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <span>生产者训练 Agent</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span>挂市场</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span>设价</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span>消费者付费使用</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
