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

const capabilities = [
  "SQL 查询自动生成",
  "Python 数据分析",
  "图表可视化生成",
  "全流程报告交付",
];

const targets = ["运营团队", "产品经理"];

export const SceneSaData: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardProg = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const tagProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: COLORS.accent,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            5
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 52,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            数据分析师
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            width: 680,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(cardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {capabilities.map((cap, i) => {
            const prog = spring({ frame: frame - 16 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={cap}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "18px 28px",
                  background: i % 2 === 0 ? COLORS.card : COLORS.bg,
                  borderBottom: i < capabilities.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.accent, fontWeight: 700 }}>
                  ✓
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.text }}>
                  {cap}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagProg, [0, 1], [16, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
            目标客户
          </div>
          {targets.map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 10,
                background: COLORS.card,
                border: `1px solid ${COLORS.accent}40`,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
