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
  { label: "免费", price: "0", agents: "1 Agent", highlight: false },
  { label: "标准", price: "29", agents: "5 Agents", highlight: true },
  { label: "专业", price: "99", agents: "无限", highlight: false },
];

export const SceneIpModel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const splitProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          商业模式
        </div>

        {/* Subscription Tiers */}
        <div style={{ display: "flex", gap: 24 }}>
          {tiers.map((tier, i) => {
            const delay = 15 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={tier.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  width: 220,
                  padding: "28px 24px",
                  borderRadius: 16,
                  background: tier.highlight ? COLORS.accent : COLORS.card,
                  border: `1px solid ${tier.highlight ? COLORS.accent : COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: tier.highlight ? COLORS.white : COLORS.muted,
                  }}
                >
                  {tier.label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 40,
                    fontWeight: 800,
                    color: tier.highlight ? COLORS.white : COLORS.text,
                  }}
                >
                  {tier.price === "0" ? "Free" : `\u00A5${tier.price}`}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: tier.highlight ? COLORS.white : COLORS.muted,
                  }}
                >
                  {tier.agents}
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Split */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: interpolate(splitProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(splitProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            市场分成
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.accent,
              padding: "10px 24px",
              borderRadius: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            生产者 80% + 平台 20%
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          API Key 用户自带，平台零推理成本
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
