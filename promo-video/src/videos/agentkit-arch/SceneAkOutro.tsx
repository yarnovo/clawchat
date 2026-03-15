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

const chains = [
  {
    name: "消息链路",
    flow: "Channel \u2192 core \u2192 tools",
    color: "#DA7756",
  },
  {
    name: "定时链路",
    flow: "scheduler \u2192 core",
    color: "#C06840",
  },
  {
    name: "评估链路",
    flow: "eval \u2192 cases \u2192 scorers",
    color: "#B05A35",
  },
];

const bullets = [
  "六个包，职责清晰",
  "每个包可以独立升级",
  "不会互相影响",
];

export const SceneAkOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          AgentKit 架构
        </div>

        {/* Three chains */}
        <div style={{ display: "flex", gap: 28 }}>
          {chains.map((chain, i) => {
            const delay = 12 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={chain.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "24px 36px",
                  boxShadow: COLORS.cardShadow,
                  minWidth: 260,
                  borderLeft: `4px solid ${chain.color}`,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: chain.color,
                  }}
                >
                  {chain.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.text,
                  }}
                >
                  {chain.flow}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bullets.map((text, i) => {
            const prog = spring({
              frame: frame - 45 - i * 10,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: COLORS.accent,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
