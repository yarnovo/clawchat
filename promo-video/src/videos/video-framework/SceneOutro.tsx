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

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const codeProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textProg = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const ctaOp = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Terminal command */}
        <div
          style={{
            transform: `scale(${codeProg})`,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            padding: "18px 40px",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 32, color: COLORS.text }}>
            <span style={{ color: COLORS.accent }}>$</span> npm run render
          </div>
        </div>

        {/* Main text */}
        <div style={{ transform: `scale(${textProg})`, textAlign: "center" }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.text,
            }}
          >
            从文案到成片
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.4,
              color: COLORS.muted,
              marginTop: 8,
            }}
          >
            一行命令
          </div>
        </div>

        {/* Tech stack */}
        <div
          style={{
            opacity: ctaOp,
            display: "flex",
            gap: 20,
          }}
        >
          {["Remotion", "Edge TTS", "React", "TypeScript"].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "10px 24px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
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
