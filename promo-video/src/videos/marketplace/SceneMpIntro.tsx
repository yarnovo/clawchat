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

export const SceneMpIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const numProg = spring({ frame: frame - 25, fps, config: { damping: 12 } });
  const subProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
          🧩
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          技能市场
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            opacity: interpolate(numProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numProg, [0, 1], [0.5, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 72,
              fontWeight: 800,
              color: COLORS.accent,
            }}
          >
            25,000+
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 36,
              fontWeight: 400,
              color: COLORS.muted,
            }}
          >
            Skills
          </div>
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
          一句话，给 Agent 装上任何能力
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
