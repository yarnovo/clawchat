import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const cards = [
  {
    title: "LLM Provider",
    desc: "实现 chat() → 构造注入",
    borderColor: COLORS.accent,
  },
  {
    title: "Session Provider",
    desc: "实现 get/add/clear → 构造注入",
    borderColor: COLORS.accent,
  },
  {
    title: "Channel",
    desc: "setup → eventLoop.push() → .use()",
    borderColor: COLORS.muted,
  },
  {
    title: "Extension",
    desc: "prompt + preBash + postBash → .use()",
    borderColor: COLORS.text,
  },
];

export const SceneAkdgSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 44, paddingBottom: 140 }}>
        {/* 2x2 Grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, width: 860,
        }}>
          {cards.map((card, i) => {
            const delay = 8 + i * 10;
            const cardProg = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });

            return (
              <div key={card.title} style={{
                background: COLORS.card,
                border: `2px solid ${card.borderColor}`,
                borderRadius: 16,
                boxShadow: COLORS.cardShadow,
                padding: "32px 28px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                opacity: interpolate(cardProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(cardProg, [0, 1], [24, 0])}px) scale(${interpolate(cardProg, [0, 1], [0.95, 1])})`,
              }}>
                {/* Title */}
                <div style={{
                  fontFamily: MONO, fontSize: 26, fontWeight: 700, color: COLORS.text,
                }}>
                  {card.title}
                </div>

                {/* Description */}
                <div style={{
                  fontFamily: FONT_SANS, fontSize: 19, color: COLORS.muted, textAlign: "center", lineHeight: 1.5,
                }}>
                  {card.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom tagline */}
        {(() => {
          const tagProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });
          return (
            <div style={{
              fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted,
              letterSpacing: 6,
              opacity: interpolate(tagProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(tagProg, [0, 1], [12, 0])}px)`,
            }}>
              互不依赖 · 独立 npm 包 · 按需组合
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
