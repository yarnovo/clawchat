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

export const SceneKdOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const cmdProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.8, 1])})`,
          }}
        >
          先跑起来，再优化
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          从单机开始，慢慢扩张，不 break，不重写
        </div>

        <div
          style={{
            padding: "16px 36px",
            borderRadius: 12,
            background: "#1A1A1A",
            fontFamily: MONO,
            fontSize: 26,
            color: "#4ADE80",
            opacity: interpolate(cmdProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cmdProg, [0, 1], [20, 0])}px)`,
          }}
        >
          curl -sfL https://get.k3s.io | sh -
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
