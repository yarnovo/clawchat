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

const models = [
  { name: "GPT-5.4", org: "OpenAI", spec: "1M 上下文" },
  { name: "Claude 4.6", org: "Anthropic", spec: "1M 上下文" },
  { name: "Gemini 3.1", org: "Google", spec: "极致性价比" },
  { name: "文心 5.0", org: "百度", spec: "2.4 万亿参数" },
  { name: "Qwen3-Max", org: "阿里", spec: "HLE 58.3 分" },
];

export const SceneAtModels: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
          前沿模型 · 效率为王
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {models.map((m, i) => {
            const delay = 10 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={m.name}
                style={{
                  width: 200,
                  padding: "24px 16px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                  {m.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {m.org}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: `${COLORS.accent}12`,
                  }}
                >
                  {m.spec}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [10, 0])}px)`,
          }}
        >
          创新重心：预训练 → 后训练（强化学习 + 领域微调）
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
