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
  "saga([",
  "  { execute: registerAccount,",
  "    compensate: deleteAccount },",
  "  { execute: createDbRecord,",
  "    compensate: deleteRecord },",
  "  { execute: addFriendship,",
  "    compensate: removeFriend },",
  "  { execute: startContainer,",
  "    compensate: stopContainer },",
  "])",
];

export const SceneSagaImpl: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({
    frame: frame - 12,
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          代码实现
        </div>

        {/* Code block */}
        <div
          style={{
            background: "rgba(0,0,0,0.03)",
            borderRadius: 12,
            padding: 32,
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(codeProg, [0, 1], [0.95, 1])})`,
          }}
        >
          {codeLines.map((line, i) => {
            const lineProg = spring({
              frame: frame - 18 - i * 4,
              fps,
              config: { damping: 16, mass: 0.5 },
            });

            // Highlight execute/compensate keywords
            const isExecute = line.includes("execute:");
            const isCompensate = line.includes("compensate:");

            let displayColor = COLORS.text;
            if (isExecute) displayColor = COLORS.text;
            if (isCompensate) displayColor = COLORS.accent;

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  lineHeight: 1.8,
                  color: displayColor,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [20, 0])}px)`,
                  whiteSpace: "pre",
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
