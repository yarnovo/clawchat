import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const codeLines = [
  "new AgentRunner({ llm, tools })",
  "  .use(skillsExtension())",
  "  .use(memoryExtension())",
  "  .use(schedulerChannel())",
  "  .use(httpChannel())",
  "  .start()",
];

export const SceneAkclDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
          CLI = 组装层
        </div>

        {/* Code block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "40px 60px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          {codeLines.map((line, i) => {
            const delay = 14 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isFirst = i === 0;
            const isLast = i === codeLines.length - 1;
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 32,
                  fontWeight: isFirst || isLast ? 700 : 500,
                  color: isFirst || isLast ? COLORS.text : COLORS.accent,
                  lineHeight: 1.9,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [18, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
