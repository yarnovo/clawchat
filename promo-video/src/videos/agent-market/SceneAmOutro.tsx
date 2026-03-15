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

const mappings = [
  { left: "容器", right: "Agent", symbol: "=" },
  { left: "fork", right: "复制", symbol: "=" },
  { left: "commit", right: "成长", symbol: "=" },
  { left: "上架", right: "变现", symbol: "=" },
];

export const SceneAmOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const taglineProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
        {/* 映射关系 */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {mappings.map((m, i) => {
            const delay = 6 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={m.left}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 24px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                  {m.left}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                  {m.symbol}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.accent }}>
                  {m.right}
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
          Agent 市场
        </div>

        {/* 底部标语 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(taglineProg, [0, 1], [0, 1]),
          }}
        >
          每个人都能拥有、教育、分享自己的 AI 专家
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
