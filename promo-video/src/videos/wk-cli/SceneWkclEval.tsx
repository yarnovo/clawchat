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

const loadCode = `const casesFile = path.join(abs, 'evals', 'cases.jsonl');
let cases: EvalCase[] = fs.readFileSync(casesFile, 'utf-8')
  .split('\\n')
  .filter(l => l.trim())
  .map(l => JSON.parse(l));`;

const scoreCode = `for (const c of cases) {
  const trace: AgentTrace = {
    input: c.input,
    output: (c.mustContain || []).join('、'),
    toolCalls: (c.expectedTools || [])
      .map(name => ({ name, arguments: {} })),
  };
  const scores = runScorers(c, trace);
  const allPass = scores.every(s => s.pass);
  if (allPass) passed++; else failed++;
}`;

const reportCode = `const passRate = (passed / total * 100).toFixed(1);
fs.writeFileSync(reportPath, JSON.stringify({
  agent: agentName,
  summary: { total, passed, failed, passRate },
  cases: report,
}, null, 2));
process.exit(failed > 0 ? 1 : 0);`;

const terminalLines = [
  { text: "legal-assistant -- 10 cases", type: "header" as const },
  { text: "", type: "blank" as const },
  { text: "  [toolCorrectness] ...", type: "pass" as const },
  { text: "  [trajectoryMatch] ...", type: "pass" as const },
  { text: "  [contentCheck] ...", type: "fail" as const },
  { text: "", type: "blank" as const },
  { text: "  8    2    80%    42ms", type: "summary" as const },
];

export const SceneWkclEval: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const loadProg = spring({ frame: frame - 14, fps, config: { damping: 14, mass: 0.7 } });
  const scoreProg = spring({ frame: frame - 36, fps, config: { damping: 14, mass: 0.7 } });
  const reportProg = spring({ frame: frame - 56, fps, config: { damping: 14, mass: 0.7 } });
  const termProg = spring({ frame: frame - 72, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 40,
          paddingBottom: 140,
          gap: 20,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          <span style={{ color: COLORS.muted }}>$ agentkit </span>
          <span style={{ color: COLORS.accent }}>eval</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            padding: "0 50px",
            width: "100%",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {/* Left: code blocks */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              flex: 1,
              maxWidth: 620,
            }}
          >
            {/* Load cases */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(loadProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(loadProg, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                1. cases.jsonl
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: COLORS.muted,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {loadCode.split("\n").map((line, i) => {
                  const isKey = line.includes("EvalCase") || line.includes("cases.jsonl");
                  return (
                    <div key={i}>
                      <span style={{ color: isKey ? COLORS.text : COLORS.muted, fontWeight: isKey ? 600 : 400 }}>
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Score loop */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(scoreProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(scoreProg, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                2. runScorers
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {scoreCode.split("\n").map((line, i) => {
                  const isScorer = line.includes("runScorers");
                  const isPass = line.includes("allPass") || line.includes("passed") || line.includes("failed");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isScorer
                            ? COLORS.accent
                            : isPass
                              ? COLORS.text
                              : COLORS.muted,
                          fontWeight: isScorer ? 700 : isPass ? 600 : 400,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Report */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(reportProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(reportProg, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                3. report.json + exit code
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: COLORS.muted,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {reportCode.split("\n").map((line, i) => {
                  const isExit = line.includes("process.exit");
                  const isWrite = line.includes("writeFileSync");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isExit ? COLORS.accent : isWrite ? COLORS.text : COLORS.muted,
                          fontWeight: isExit || isWrite ? 700 : 400,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>

          {/* Right: terminal preview */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 16,
              padding: "28px 40px 36px",
              minWidth: 500,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
              opacity: interpolate(termProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(termProg, [0, 1], [0.92, 1])})`,
            }}
          >
            {/* Title bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27CA40" }} />
              <div style={{ fontFamily: MONO, fontSize: 14, color: "#888", marginLeft: 12 }}>
                agentkit eval ./agents/legal
              </div>
            </div>

            {/* Terminal lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {terminalLines.map((line, i) => {
                const lineDelay = 76 + i * 8;
                const lineProg = spring({
                  frame: frame - lineDelay,
                  fps,
                  config: { damping: 14, mass: 0.5 },
                });

                if (line.type === "blank") {
                  return <div key={i} style={{ height: 10 }} />;
                }

                let textColor = "#E0E0E0";
                if (line.type === "pass") textColor = "#27CA40";
                if (line.type === "fail") textColor = "#FF5F56";
                if (line.type === "header") textColor = "#FFFFFF";
                if (line.type === "summary") textColor = COLORS.accent;

                return (
                  <div
                    key={i}
                    style={{
                      fontFamily: MONO,
                      fontSize: line.type === "header" ? 26 : line.type === "summary" ? 28 : 22,
                      fontWeight: line.type === "header" || line.type === "summary" ? 700 : 400,
                      color: textColor,
                      opacity: interpolate(lineProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(lineProg, [0, 1], [-14, 0])}px)`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
