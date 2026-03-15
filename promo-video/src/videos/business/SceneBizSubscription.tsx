import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const plans = [
  { name: "免费版", price: "¥0/月", agents: "1 个 Agent", features: "基础聊天" },
  { name: "标准版", price: "¥29/月", agents: "5 个 Agent", features: "全部功能", highlight: true },
  { name: "Pro 版", price: "¥99/月", agents: "20 个 Agent", features: "专属支持" },
];

export const SceneBizSubscription: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          订阅收入
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {plans.map((plan, i) => {
            const cardProg = spring({
              frame: frame - 12 - i * 8,
              fps,
              config: { damping: 12, mass: 0.8 },
            });
            return (
              <div
                key={plan.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 40px",
                  borderRadius: 16,
                  backgroundColor: COLORS.card,
                  border: plan.highlight
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: plan.highlight
                    ? `0 4px 24px rgba(218,119,86,0.15)`
                    : COLORS.cardShadow,
                  minWidth: 260,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: plan.highlight ? COLORS.accent : COLORS.text,
                  }}
                >
                  {plan.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 44,
                    fontWeight: 800,
                    color: COLORS.text,
                  }}
                >
                  {plan.price}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 500,
                    color: COLORS.accent,
                  }}
                >
                  {plan.agents}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {plan.features}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
