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

const tags = [".openclaw", "SESSION JSONL", "USER node"];

export const SceneOvIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
        <div style={{ transform: `scale(${iconScale})`, fontSize: 90 }}>
          📂
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
          OpenClaw Volume 结构
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
          开发者必知
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 700,
            marginTop: 8,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.accent,
                padding: "6px 14px",
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
