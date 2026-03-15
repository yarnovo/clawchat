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

const CONTENT_CODE = `function contentCheck(
  output: string,
  mustContain: string[],
  mustNotContain: string[]
): ScoreResult {
  const missing = mustContain.filter(
    k => !output.includes(k)
  );
  const forbidden = mustNotContain.filter(
    k => output.includes(k)
  );
  const total = mustContain.length
    + mustNotContain.length;
  const failures = missing.length
    + forbidden.length;
  const score = (total - failures) / total;
  return { name: 'contentCheck',
    score, pass: failures === 0 };
}`;

const RUN_CODE = `function runScorers(
  c: EvalCase, trace: AgentTrace
): ScoreResult[] {
  const results: ScoreResult[] = [];
  for (const name of c.scorers) {
    if (name === 'toolCorrectness')
      results.push(
        toolCorrectness(trace, c.expectedTools || [])
      );
    else if (name === 'trajectoryMatch')
      results.push(
        trajectoryMatch(trace, c.trajectory || [])
      );
    else if (name === 'contentCheck')
      results.push(
        contentCheck(trace.output,
          c.mustContain || [],
          c.mustNotContain || [])
      );
  }
  return results;
}`;

export const SceneContentRun: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const annotProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          contentCheck + runScorers
        </div>

        {/* Two code blocks side by side */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 8,
          }}
        >
          {/* contentCheck */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 14,
              padding: "22px 28px",
              boxShadow: "0 6px 32px rgba(0,0,0,0.15)",
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-24, 0])}px)`,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27CA40" }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#666", marginLeft: 8 }}>
                contentCheck
              </span>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 15,
                color: "#E0E0E0",
                whiteSpace: "pre",
                lineHeight: 1.5,
              }}
            >
              {CONTENT_CODE}
            </div>
          </div>

          {/* runScorers */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 14,
              padding: "22px 28px",
              boxShadow: "0 6px 32px rgba(0,0,0,0.15)",
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [24, 0])}px)`,
            }}
          >
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F56" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27CA40" }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: "#666", marginLeft: 8 }}>
                runScorers
              </span>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 15,
                color: "#E0E0E0",
                whiteSpace: "pre",
                lineHeight: 1.5,
              }}
            >
              {RUN_CODE}
            </div>
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 8,
            opacity: interpolate(annotProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(annotProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {[
            { label: "mustContain", color: "#22C55E" },
            { label: "mustNotContain", color: "#EF4444" },
            { label: "case.scorers \u2192 dispatch", color: "#3B82F6" },
          ].map((a) => (
            <div
              key={a.label}
              style={{
                fontFamily: MONO,
                fontSize: 17,
                fontWeight: 600,
                color: a.color,
                padding: "8px 20px",
                borderRadius: 20,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                whiteSpace: "pre",
              }}
            >
              {a.label}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
