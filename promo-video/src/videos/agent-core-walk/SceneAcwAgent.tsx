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

const pseudoLines = [
  { code: "while (round < maxRounds) {", indent: 0 },
  { code: "  const res = await llm.chat(messages, tools)", indent: 1 },
  { code: "  if (res.toolCalls) {", indent: 1 },
  { code: "    const results = await executeTools(res.toolCalls)", indent: 2 },
  { code: "    messages.push(...results)", indent: 2 },
  { code: "    continue", indent: 2 },
  { code: "  }", indent: 1 },
  { code: "  return res.text", indent: 1 },
  { code: "}", indent: 0 },
];

export const SceneAcwAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          agent.ts · while 循环
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 16,
          }}
        >
          不到一百行的 Agent 核心
        </div>

        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            boxShadow: COLORS.cardShadow,
            padding: "36px 48px",
            maxWidth: 1100,
          }}
        >
          {pseudoLines.map((line, i) => {
            const delay = 15 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            const isHighlight = line.code.includes("llm.chat") || line.code.includes("executeTools");
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  lineHeight: 2,
                  color: isHighlight ? COLORS.accent : COLORS.text,
                  fontWeight: isHighlight ? 700 : 400,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                  whiteSpace: "pre",
                }}
              >
                {line.code}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 16,
          }}
        >
          {["workDir 参数", "自动加载人格"].map((t, i) => {
            const delay = 70 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14 } });
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
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [12, 0])}px)`,
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
