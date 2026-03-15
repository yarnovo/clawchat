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

const modules = [
  { name: "auth", desc: "认证" },
  { name: "agents", desc: "Agent 管理" },
  { name: "containers", desc: "容器管理" },
  { name: "market", desc: "市场" },
  { name: "billing", desc: "计费" },
];

const bullets = [
  "后端只管资源不管对话",
  "对话在容器内闭环",
  "一台 ECS 就能跑",
];

export const SceneBaOutro: React.FC = () => {
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
          管资源不管对话
        </div>

        {/* Five module tags */}
        <div style={{ display: "flex", gap: 20 }}>
          {modules.map((mod, i) => {
            const delay = 12 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isCenter = mod.name === "containers";
            return (
              <div
                key={mod.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  background: isCenter ? COLORS.accent : COLORS.card,
                  border: isCenter ? "none" : `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  padding: "18px 28px",
                  boxShadow: isCenter
                    ? "0 4px 24px rgba(218,119,86,0.2)"
                    : COLORS.cardShadow,
                  minWidth: 140,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 700,
                    color: isCenter ? COLORS.white : COLORS.accent,
                  }}
                >
                  {mod.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    color: isCenter ? "rgba(255,255,255,0.8)" : COLORS.muted,
                  }}
                >
                  {mod.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary bullets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {bullets.map((text, i) => {
            const prog = spring({
              frame: frame - 50 - i * 10,
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
