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
  { text: 'import { evalite } from "vitest-evals";', indent: 0 },
  { text: 'import { ToolCallScorer } from "vitest-evals/scorers";', indent: 0 },
  { text: "", indent: 0 },
  { text: 'evalite("tool call accuracy", async () => {', indent: 0 },
  { text: "const result = await agent.chat(input);", indent: 1 },
  { text: "return { output: result.toolCalls };", indent: 1 },
  { text: "}, { scorers: [ToolCallScorer] });", indent: 0 },
];

export const SceneEfL1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 16, fps, config: { damping: 14, mass: 0.7 } });
  const footerProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.text,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            L1 · vitest-evals
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.white,
              background: COLORS.accent,
              padding: "6px 18px",
              borderRadius: 8,
              opacity: interpolate(badgeProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
            }}
          >
            Sentry 出品
          </div>
        </div>

        {/* Code block */}
        <div
          style={{
            background: "#1E1E1E",
            borderRadius: 16,
            padding: "32px 48px",
            boxShadow: "0 4px 30px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            minWidth: 800,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(codeProg, [0, 1], [0.95, 1])})`,
          }}
        >
          {codeLines.map((line, i) => {
            const lineDelay = 20 + i * 4;
            const lineProg = spring({ frame: frame - lineDelay, fps, config: { damping: 14, mass: 0.4 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: line.text === "" ? "transparent" : "#D4D4D4",
                  paddingLeft: line.indent * 32,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [-10, 0])}px)`,
                  minHeight: 32,
                }}
              >
                {line.text || "\u00A0"}
              </div>
            );
          })}
        </div>

        {/* Footer badges */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["Vitest 原生", "ToolCallScorer", "零配置"].map((t, i) => {
            const delay = 65 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={t}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                {t}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
