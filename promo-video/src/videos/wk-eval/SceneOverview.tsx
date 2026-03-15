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

const TYPE_DEF = `type ScorerName =
  | 'toolCorrectness'
  | 'trajectoryMatch'
  | 'contentCheck';`;

const EVAL_CASE = `interface EvalCase {
  scorers: ScorerName[];
  input: string;
  expectedTools?: string[];
  trajectory?: Array<{ tool: string }>;
  mustContain?: string[];
  mustNotContain?: string[];
}`;

const scorers = [
  { name: "toolCorrectness", desc: "工具是否正确", color: "#22C55E" },
  { name: "trajectoryMatch", desc: "调用顺序匹配", color: "#3B82F6" },
  { name: "contentCheck", desc: "关键词检查", color: "#A855F7" },
];

export const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });
  const caseProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            transform: `scale(${titleProg})`,
          }}
        >
          @agentkit/eval
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 2,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [16, 0])}px)`,
          }}
        >
          scorers.ts -- 三种评分器，按需组合
        </div>

        {/* Scorer badges */}
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          {scorers.map((s, i) => {
            const delay = 16 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 28px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: s.color,
                    whiteSpace: "pre",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 16,
                    color: COLORS.muted,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Code blocks side by side */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 12,
          }}
        >
          {/* ScorerName type */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 12,
              padding: "20px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: "#888",
                marginBottom: 10,
              }}
            >
              ScorerName
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                color: "#E0E0E0",
                whiteSpace: "pre",
                lineHeight: 1.6,
              }}
            >
              {TYPE_DEF}
            </div>
          </div>

          {/* EvalCase interface */}
          <div
            style={{
              background: "#1E1E1E",
              borderRadius: 12,
              padding: "20px 28px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              opacity: interpolate(caseProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(caseProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 11,
                color: "#888",
                marginBottom: 10,
              }}
            >
              EvalCase
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                color: "#E0E0E0",
                whiteSpace: "pre",
                lineHeight: 1.6,
              }}
            >
              {EVAL_CASE}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
