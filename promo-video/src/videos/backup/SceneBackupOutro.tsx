import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT } from "../../constants";

export const SceneBackupOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.8 },
  });

  const glow = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

  const textOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1e1a4e", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 120,
        }}
      >
        {/* 盾牌 + 勾 */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            fontSize: 100,
            filter: `drop-shadow(0 0 ${glow * 40}px rgba(96,165,250,${glow * 0.5}))`,
          }}
        >
          🛡️
        </div>

        {/* 主文案 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 800,
            opacity: textOpacity,
            background:
              "linear-gradient(135deg, #ffffff 20%, #60a5fa 50%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          数据安全，从备份开始
        </div>

        {/* 副标题 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 300,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: 6,
            opacity: subOpacity,
          }}
        >
          ClawChat Backup Strategy
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
