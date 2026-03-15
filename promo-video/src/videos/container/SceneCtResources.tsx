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

const cards = [
  { label: "内存限制", value: "256MB per container" },
  { label: "CPU 限制", value: "0.5 核 per container" },
];

export const SceneCtResources: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          资源限制
        </div>

        {/* Two cards */}
        <div style={{ display: "flex", gap: 40 }}>
          {cards.map((card, i) => {
            const cardProg = spring({
              frame: frame - 12 - i * 12,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={card.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 48px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  minWidth: 360,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Volume 持久化，重启不丢数据
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
