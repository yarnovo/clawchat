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

const codeLines = [
  ".use(skillsExtension())",
  ".use(memoryExtension())",
  ".use(schedulerChannel())",
  ".use(httpChannel())",
];

export const SceneAkagSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({
    frame: frame - 20 - codeLines.length * 12,
    fps,
    config: { damping: 14 },
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
          gap: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Express 风格注册
        </div>

        {/* Code block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "36px 56px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          {codeLines.map((line, i) => {
            const delay = 12 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 34,
                  fontWeight: 500,
                  color: COLORS.accent,
                  lineHeight: 1.8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [18, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [15, 0])}px)`,
          }}
        >
          按需组合
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
