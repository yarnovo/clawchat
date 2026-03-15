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
  { text: "function parseHeartbeat(content: string) {", indent: 0, hl: true },
  { text: "  const tasks: ScheduledTask[] = [];", indent: 0, hl: false },
  { text: "  const errors: string[] = [];", indent: 0, hl: false },
  { text: "  for (const section of content.split(/^## /m)", indent: 0, hl: true },
  { text: "       .filter(s => s.trim())) {", indent: 0, hl: false },
  { text: "    const lines = section.trim().split('\\n');", indent: 0, hl: false },
  { text: "    const name = lines[0].trim();", indent: 0, hl: false },
  { text: "    let cron = '', prompt = '';", indent: 0, hl: true },
  { text: "    for (const line of lines.slice(1)) {", indent: 0, hl: false },
  { text: "      if (t.startsWith('cron:'))", indent: 0, hl: true },
  { text: "        cron = t.slice(5).trim();", indent: 0, hl: false },
  { text: "      else if (t.startsWith('prompt:'))", indent: 0, hl: true },
  { text: "        prompt = t.slice(7).trim();", indent: 0, hl: false },
  { text: "    }", indent: 0, hl: false },
  { text: "    try {", indent: 0, hl: false },
  { text: "      CronExpressionParser.parse(cron);", indent: 0, hl: true },
  { text: "      tasks.push({ name, cron, prompt });", indent: 0, hl: false },
  { text: "    } catch {", indent: 0, hl: false },
  { text: "      errors.push(`invalid cron \"${cron}\"`);", indent: 0, hl: true },
  { text: "    }", indent: 0, hl: false },
  { text: "  }", indent: 0, hl: false },
  { text: "  return { tasks, errors };", indent: 0, hl: false },
  { text: "}", indent: 0, hl: false },
];

export const SceneWkcsParse: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
          parseHeartbeat()
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: "20px 28px",
            boxShadow: COLORS.cardShadow,
            maxWidth: 1100,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Terminal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
            <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted, marginLeft: 10 }}>
              parseHeartbeat — split ## / extract cron: prompt: / validate
            </div>
          </div>

          {codeLines.map((line, i) => {
            const lineProg = spring({
              frame: frame - 18 - i * 2,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 17,
                  color: line.hl ? COLORS.accent : COLORS.text,
                  fontWeight: line.hl ? 600 : 400,
                  whiteSpace: "pre",
                  lineHeight: 1.55,
                  background: line.hl ? "rgba(218,119,86,0.06)" : "transparent",
                  borderRadius: 4,
                  padding: "1px 4px",
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [20, 0])}px)`,
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
