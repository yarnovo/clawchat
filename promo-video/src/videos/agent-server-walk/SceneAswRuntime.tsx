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

const treeLines = [
  { text: "runtime-client", indent: 0, isRoot: true },
  { text: "\u251C\u2500\u2500 openclaw-client  \u2192  OpenClaw \u5BB9\u5668", indent: 1, isRoot: false },
  { text: "\u251C\u2500\u2500 nanoclaw-client  \u2192  NanoClaw \u5BB9\u5668", indent: 1, isRoot: false },
  { text: "\u2514\u2500\u2500 ironclaw-client  \u2192  IronClaw \u5BB9\u5668", indent: 1, isRoot: false },
];

export const SceneAswRuntime: React.FC = () => {
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
          gap: 40,
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
          Runtime Client
        </div>

        {/* Code tree */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "28px 48px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          {treeLines.map((line, i) => {
            const delay = 10 + i * 8;
            const lineProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: line.isRoot ? 32 : 28,
                  fontWeight: line.isRoot ? 700 : 400,
                  color: line.isRoot ? COLORS.text : COLORS.text,
                  paddingLeft: line.indent * 32,
                  lineHeight: 2,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [30, 0])}px)`,
                  whiteSpace: "pre",
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* Bottom label */}
        {(() => {
          const labelProg = spring({
            frame: frame - 50,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                fontWeight: 600,
                color: COLORS.accent,
                opacity: interpolate(labelProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(labelProg, [0, 1], [20, 0])}px)`,
              }}
            >
              统一接口，可热切换
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
