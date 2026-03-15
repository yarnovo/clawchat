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

const tiers = [
  { name: "免费", price: "$0", desc: "基础对话" },
  { name: "基础", price: "$5/月", desc: "记忆 30 天" },
  { name: "高级", price: "$15/月", desc: "永久记忆 + 多模态" },
  { name: "终身", price: "$50", desc: "数据永久归档" },
];

export const SceneBizLoneliness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const insightProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const marketProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          陪伴维度 · 记忆即服务
        </div>

        {/* 核心洞察 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            color: COLORS.accent,
            fontWeight: 600,
            opacity: interpolate(insightProg, [0, 1], [0, 1]),
          }}
        >
          聊了三个月，你不会轻易离开
        </div>

        {/* 订阅模型 */}
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          {tiers.map((t, i) => {
            const delay = 20 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={t.name}
                style={{
                  padding: "20px 28px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 180,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.muted,
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {t.price}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {t.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* 市场数据 */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: COLORS.accent,
            marginTop: 4,
            opacity: interpolate(marketProg, [0, 1], [0, 1]),
          }}
        >
          2035 年 AI 陪伴市场：$5525 亿
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
