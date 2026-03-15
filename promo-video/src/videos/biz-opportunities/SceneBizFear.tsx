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

const fomoChain = ["别人用了", "我也要", "买买买"];

const bizList = [
  { name: "AI 扫盲培训", desc: "帮小白从零开始" },
  { name: "Agent 上手指南", desc: "实操教程 + 模板" },
  { name: "企业导入咨询", desc: "按企业定制方案" },
  { name: "排行榜 / 评测", desc: "模仿欲望驱动购买" },
];

export const SceneBizFear: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const chainProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          恐惧维度 · FOMO 驱动链
        </div>

        {/* FOMO 链 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(chainProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(chainProg, [0, 1], [0.8, 1])})`,
          }}
        >
          {fomoChain.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 36,
                  fontWeight: 700,
                  color: COLORS.accent,
                  padding: "14px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `2px solid ${COLORS.accent}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {step}
              </div>
              {i < fomoChain.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 商机列表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 800 }}>
          {bizList.map((b, i) => {
            const delay = 25 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={b.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "14px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 240,
                    flexShrink: 0,
                  }}
                >
                  {b.name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {b.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
