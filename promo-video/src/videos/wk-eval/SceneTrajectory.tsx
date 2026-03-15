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

const CODE = `function trajectoryMatch(
  trace: AgentTrace,
  expected: Array<{ tool: string }>
): ScoreResult {
  const actual = trace.toolCalls.map(t => t.name);
  const expectedNames = expected.map(e => e.tool);

  let j = 0;
  for (let i = 0;
       i < actual.length && j < expectedNames.length;
       i++) {
    if (actual[i] === expectedNames[j]) j++;
  }

  const score = j / expectedNames.length;
  return {
    name: 'trajectoryMatch',
    score,
    pass: score >= 0.8,
    reason: score < 1
      ? \`Expected: [\${expectedNames.join(' \u2192 ')}]\`
      : 'Trajectory matched',
  };
}`;

const steps = [
  { icon: "j = 0", text: "指针从零开始" },
  { icon: "i++", text: "遍历 actual 数组" },
  { icon: "j++", text: "命中则前进" },
  { icon: "j / N", text: "比值即得分" },
];

export const SceneTrajectory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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

        {/* Right: title + step-by-step */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            flex: "0 0 340px",
          }}
        >
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
            trajectoryMatch
          </div>

          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              color: COLORS.muted,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              lineHeight: 1.5,
            }}
          >
            子序列匹配算法
          </div>

          {/* Steps */}
          {steps.map((s, i) => {
            const delay = 28 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={s.icon}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#3B82F6",
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    padding: "8px 16px",
                    whiteSpace: "pre",
                    minWidth: 80,
                    textAlign: "center",
                  }}
                >
                  {s.icon}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.text,
                  }}
                >
                  {s.text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
