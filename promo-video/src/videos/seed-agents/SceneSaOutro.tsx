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

const agents = [
  { label: "法律", short: "法" },
  { label: "电商", short: "电" },
  { label: "代码", short: "码" },
  { label: "客服", short: "服" },
  { label: "数据", short: "数" },
];

export const SceneSaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const rowProg = spring({ frame: frame - 16, fps, config: { damping: 14 } });
  const sloganProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
        {/* 五个 Agent 图标横排 */}
        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(rowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(rowProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {agents.map((a, i) => {
            const prog = spring({ frame: frame - 16 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={a.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.6, 1])})`,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    background: COLORS.accent,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.white,
                  }}
                >
                  {a.short}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {a.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* 主标题 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.accent,
            padding: "14px 48px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            transform: `scale(${titleProg})`,
          }}
        >
          先服务，后市场
        </div>

        {/* 路径 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(sloganProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sloganProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {["跑通闭环", "积累口碑", "开放市场"].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.text,
                  padding: "12px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {step}
              </div>
              {i < 2 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.accent, fontWeight: 700 }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
