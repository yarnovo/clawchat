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

const tiers = [
  {
    name: "定制开发",
    price: "¥5K - 30K",
    desc: "按复杂度一次性收费",
  },
  {
    name: "月度运行",
    price: "¥500 - 3K / 月",
    desc: "托管 + API + 维护",
  },
  {
    name: "API 差价",
    price: "隐藏利润",
    desc: "统一采购，加价转售",
  },
];

export const SceneAaPricing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          三层定价
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {tiers.map((tier, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={tier.name}
                style={{
                  width: 360,
                  padding: "36px 32px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.text }}>
                  {tier.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, fontWeight: 700, color: COLORS.accent }}>
                  {tier.price}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, textAlign: "center" }}>
                  {tier.desc}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.accent,
            fontWeight: 600,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          一个客户年收入过万
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
