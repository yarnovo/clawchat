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

const interfaceLines = [
  { text: "interface LLMProvider {", indent: 0 },
  { text: "  chat(", indent: 0 },
  { text: "    messages: ChatMessage[],", indent: 0 },
  { text: "    tools?: ToolDefinition[]", indent: 0 },
  { text: "  ): Promise<LLMResponse>;", indent: 0 },
  { text: "}", indent: 0 },
];

const usageLines = [
  { text: "new AgentRunner({", indent: 0 },
  { text: "  llm: new MyProvider({ apiKey })", indent: 0 },
  { text: "})", indent: 0 },
];

/**
 * Scene 2: LLM Provider interface + usage example
 */
export const SceneAkdgProviderLlm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Title --- */
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14 },
  });

  /* --- Interface card --- */
  const cardProg = spring({
    frame: frame - 22,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  /* --- Usage card --- */
  const usageCardProg = spring({
    frame: frame - (22 + interfaceLines.length * 8 + 10),
    fps,
    config: { damping: 14, mass: 0.7 },
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
          gap: 32,
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
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          扩展点 1: LLM Provider
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            letterSpacing: 2,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [12, 0])}px)`,
          }}
        >
          实现 LLMProvider 接口
        </div>

        {/* Interface definition card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            boxShadow: COLORS.cardShadow,
            padding: "28px 36px",
            opacity: interpolate(cardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {interfaceLines.map((line, i) => {
            const lineProg = spring({
              frame: frame - (28 + i * 8),
              fps,
              config: { damping: 14, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 500,
                  color: COLORS.text,
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* Usage example card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            boxShadow: COLORS.cardShadow,
            padding: "24px 36px",
            opacity: interpolate(usageCardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(usageCardProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {usageLines.map((line, i) => {
            const lineProg = spring({
              frame:
                frame -
                (22 + interfaceLines.length * 8 + 16 + i * 8),
              fps,
              config: { damping: 14, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  fontWeight: 500,
                  color: COLORS.accent,
                  lineHeight: 1.7,
                  whiteSpace: "pre",
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
