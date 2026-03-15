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

const levels = [
  { level: "L1", label: "工具调用", desc: "调对了工具吗?" },
  { level: "L2", label: "轨迹", desc: "步骤对了吗?" },
  { level: "L3", label: "内容", desc: "回答正确吗?" },
];

export const SceneAkEval: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          评估链路
        </div>

        {/* Flow: cases.jsonl → scorers → report.json */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {/* Input */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 32px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 20, color: COLORS.muted }}>
              evals/
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              cases.jsonl
            </div>
          </div>

          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              color: COLORS.accent,
              padding: "0 20px",
            }}
          >
            {"\u2192"}
          </div>

          {/* Scorers */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: COLORS.accent,
              borderRadius: 16,
              padding: "24px 36px",
              boxShadow: "0 4px 24px rgba(218,119,86,0.2)",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              eval
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.white,
              }}
            >
              scorers
            </div>
          </div>

          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              color: COLORS.accent,
              padding: "0 20px",
            }}
          >
            {"\u2192"}
          </div>

          {/* Output */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 32px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 20, color: COLORS.muted }}>
              evals/
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              report.json
            </div>
          </div>
        </div>

        {/* Three levels */}
        <div style={{ display: "flex", gap: 28 }}>
          {levels.map((lv, i) => {
            const delay = 40 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={lv.level}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  padding: "22px 32px",
                  boxShadow: COLORS.cardShadow,
                  minWidth: 200,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {lv.level}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {lv.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {lv.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
