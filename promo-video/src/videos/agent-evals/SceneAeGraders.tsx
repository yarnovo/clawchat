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

const graders = [
  {
    label: "人工评估",
    desc: "金标准 · 校准 LLM 裁判",
    detail: "成本高但最准",
    color: COLORS.accent,
    width: 400,
  },
  {
    label: "LLM-as-Judge",
    desc: "评开放式回答",
    detail: "准确度 85%",
    color: "#C4956A",
    width: 560,
  },
  {
    label: "代码 Grader",
    desc: "确定性判断 · 工具名匹配 · 正则检查",
    detail: "快且便宜",
    color: COLORS.muted,
    width: 740,
  },
];

export const SceneAeGraders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          三种评估者 · 金字塔
        </div>

        {/* Pyramid: top is narrow (human), bottom is wide (code) */}
        {graders.map((g, i) => {
          const delay = 12 + i * 16;
          const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <div
              key={g.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
                width: g.width,
                padding: "24px 36px",
                borderRadius: 14,
                background: COLORS.card,
                border: `2px solid ${g.color}`,
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: g.color,
                  }}
                >
                  {g.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.text,
                  }}
                >
                  {g.desc}
                </div>
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: COLORS.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {g.detail}
              </div>
            </div>
          );
        })}

        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(badgeProg, [0, 1], [16, 0])}px)`,
          }}
        >
          DeepEval 一个框架全部支持
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
