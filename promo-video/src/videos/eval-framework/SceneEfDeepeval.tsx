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

const metrics = [
  { name: "ToolCorrectness", desc: "评工具选择", color: COLORS.accent },
  { name: "ArgumentCorrectness", desc: "评参数准确", color: "#C4956A" },
  { name: "ToolUse", desc: "评多轮调用", color: "#7B8EC4" },
  { name: "TaskCompletion", desc: "评任务完成", color: "#5A9E6F" },
  { name: "PlanQuality", desc: "评规划能力", color: "#9B6FB0" },
  { name: "Orchestration", desc: "评编排效率", color: "#B05A5A" },
];

export const SceneEfDeepeval: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const statsProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });

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
        {/* Title + stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
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
            DeepEval
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              opacity: interpolate(statsProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(statsProg, [0, 1], [12, 0])}px)`,
            }}
          >
            {[
              { label: "12.8k", unit: "stars" },
              { label: "3M", unit: "月下载" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <span style={{ fontFamily: MONO, fontWeight: 700, color: COLORS.accent }}>{s.label}</span>{" "}
                {s.unit}
              </div>
            ))}
          </div>
        </div>

        {/* 6 metric cards in 3x2 grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            maxWidth: 1100,
          }}
        >
          {metrics.map((m, i) => {
            const delay = 16 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={m.name}
                style={{
                  background: COLORS.card,
                  border: `2px solid ${m.color}`,
                  borderRadius: 16,
                  boxShadow: COLORS.cardShadow,
                  padding: "24px 32px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 300,
                  width: 320,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: m.color,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
