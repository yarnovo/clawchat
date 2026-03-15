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

const products = [
  { name: "家族口述史", desc: "帮老人录故事，训练成可对话 Agent" },
  { name: "数字化身", desc: "学习你的风格、价值观，死后继续代表你" },
  { name: "AI 回忆录", desc: "将人生故事转化为交互式叙事" },
];

const stats = [
  { label: "悲伤科技融资", value: "$3 亿+" },
  { label: "Eternos 种子轮", value: "$1030 万" },
  { label: "市场 CAGR", value: "11.37%" },
];

export const SceneBizLegacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const statsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
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
          永恒 · 对抗遗忘
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          人的终极恐惧不是被淘汰，而是被遗忘
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {products.map((p) => (
            <div
              key={p.name}
              style={{
                width: 340,
                padding: "24px 28px",
                borderRadius: 14,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.accent }}>
                {p.name}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.5 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            opacity: interpolate(statsProg, [0, 1], [0, 1]),
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: COLORS.accent }}>
                {s.value}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
