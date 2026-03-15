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

export const SceneDxIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cmdProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const tags = ["Docker", "热重载", "一条命令", "16 容器"];

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
            fontFamily: MONO,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.accent,
            padding: "14px 40px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            transform: `scale(${cmdProg})`,
          }}
        >
          $ make dev
        </div>

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
          本地开发一条命令
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          开发者体验 · DX
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
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
