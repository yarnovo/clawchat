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

export const SceneDevInject: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const highlightProg = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  const codeLines = [
    { text: "function buildEnv(config) {", highlight: false },
    { text: "  return [", highlight: false },
    { text: '    `OPENCLAW_GATEWAY_TOKEN=...`,', highlight: false },
    { text: '    `OPENAI_API_KEY=...`,', highlight: false },
    { text: "    // ... other env vars", highlight: false },
    { text: '    `CLAWHUB_REGISTRY=${CLAWHUB_REGISTRY}`,', highlight: true },
    { text: "  ];", highlight: false },
    { text: "}", highlight: false },
  ];

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: COLORS.accent }}>
            openclaw-server/instance.ts
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
            关键集成点
          </div>
        </div>

        {/* Code block */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            padding: "24px 32px",
            borderRadius: 12,
            background: "#1A1A1A",
            lineHeight: 1.7,
            width: 740,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {codeLines.map((line, i) => (
            <div
              key={i}
              style={{
                color: line.highlight ? "#FFD54F" : "#E8E0D8",
                fontWeight: line.highlight ? 700 : 400,
                background: line.highlight
                  ? `rgba(218,119,86,${interpolate(highlightProg, [0, 1], [0, 0.2])})`
                  : "transparent",
                padding: line.highlight ? "2px 8px" : "0 8px",
                borderRadius: 4,
                borderLeft: line.highlight ? `3px solid ${COLORS.accent}` : "3px solid transparent",
              }}
            >
              {line.text}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(highlightProg, [0, 1], [0, 1]),
          }}
        >
          一行代码，打通整条链路
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
