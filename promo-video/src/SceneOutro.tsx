import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { COLORS, FONT } from "./constants";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12 } });
  const urlOp = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 0.6]);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 30 }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 800,
              color: COLORS.white,
              textShadow: `0 0 40px rgba(108,99,255,${glow})`,
            }}
          >
            开始创作吧
          </div>
          <div style={{ fontFamily: FONT, fontSize: 28, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>
            用代码，让创意动起来
          </div>
        </div>

        <div
          style={{
            opacity: urlOp,
            fontFamily: "monospace",
            fontSize: 22,
            color: COLORS.accent,
            padding: "12px 28px",
            border: `1px solid rgba(0,210,255,0.25)`,
            borderRadius: 12,
            background: "rgba(0,210,255,0.08)",
          }}
        >
          remotion.dev
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
