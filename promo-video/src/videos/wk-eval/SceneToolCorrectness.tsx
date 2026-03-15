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

const CODE = `function toolCorrectness(
  trace: AgentTrace,
  expected: string[]
): ScoreResult {
  const called = trace.toolCalls.map(t => t.name);
  const matched = expected.filter(
    e => called.includes(e)
  );
  const score = matched.length / expected.length;
  const missing = expected.filter(
    e => !called.includes(e)
  );
  return {
    name: 'toolCorrectness',
    score,
    pass: score >= 0.8,
    reason: missing.length > 0
      ? \`Missing: \${missing.join(', ')}\`
      : 'All tools matched',
  };
}`;

const highlights = [
  { label: "expected vs called", desc: "比对工具名列表", color: "#22C55E" },
  { label: "matched / expected", desc: "计算匹配比值", color: "#3B82F6" },
  { label: "pass: score >= 0.8", desc: "阈值 80% 才通过", color: COLORS.accent },
];

export const SceneToolCorrectness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "row",
          gap: 48,
          paddingBottom: 140,
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        {/* Left: code */}
        <div
          style={{
            background: "#1E1E1E",
            borderRadius: 16,
            padding: "28px 36px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            flex: "0 0 auto",
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(codeProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          {/* Terminal dots */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27CA40" }} />
            <div
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: "#666",
                marginLeft: 12,
              }}
            >
              scorers.ts
            </div>
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 17,
              color: "#E0E0E0",
              whiteSpace: "pre",
              lineHeight: 1.55,
            }}
          >
            {CODE}
          </div>
        </div>

        {/* Right: annotations */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            flex: "0 0 360px",
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
              transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            toolCorrectness
          </div>

          {/* Highlight cards */}
          {highlights.map((h, i) => {
            const delay = 30 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={h.label}
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [24, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 700,
                    color: h.color,
                    whiteSpace: "pre",
                    marginBottom: 6,
                  }}
                >
                  {h.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {h.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
