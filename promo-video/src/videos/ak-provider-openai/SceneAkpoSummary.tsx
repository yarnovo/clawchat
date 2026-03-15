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

const configLines = [
  'apiKey: "sk-xxx"',
  'baseURL: "https://..."',
  'model: "qwen-plus"',
];

export const SceneAkpoSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardProg = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Config card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "48px 64px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(cardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProg, [0, 1], [40, 0])}px)`,
          }}
        >
          {configLines.map((line, i) => {
            const delay = 10 + i * 8;
            const lineProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 34,
                  fontWeight: 500,
                  color: COLORS.text,
                  lineHeight: 2,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [-20, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Accent tagline */}
        {(() => {
          const tagProg = spring({
            frame: frame - 40,
            fps,
            config: { damping: 10, mass: 0.7 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 42,
                fontWeight: 700,
                color: COLORS.accent,
                letterSpacing: 2,
                opacity: interpolate(tagProg, [0, 1], [0, 1]),
                transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
              }}
            >
              换模型 = 改一行
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
