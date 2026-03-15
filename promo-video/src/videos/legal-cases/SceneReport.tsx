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

const reportItems = [
  { clause: "第六条 质量保证", risk: "高", riskColor: COLORS.accent, issue: "格式条款免除核心义务", law: "民法典 §497" },
  { clause: "第八条 违约责任", risk: "中", riskColor: "#B8860B", issue: "违约金比例过高", law: "民法典 §585" },
  { clause: "第十二条 免责声明", risk: "高", riskColor: COLORS.accent, issue: "免责范围过于宽泛", law: "民法典 §506" },
  { clause: "第十五条 竞业限制", risk: "高", riskColor: COLORS.accent, issue: "无经济补偿条款", law: "劳动合同法 §23" },
  { clause: "第三条 付款方式", risk: "低", riskColor: COLORS.muted, issue: "付款周期偏长", law: "民法典 §511" },
];

export const SceneReport: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
          结构化审查报告
        </div>

        {/* Report table */}
        <div
          style={{
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            minWidth: 1200,
          }}
        >
          {/* Header */}
          {(() => {
            const hEnt = spring({ frame: frame - 8, fps, config: { damping: 14 } });
            return (
              <div
                style={{
                  display: "flex",
                  borderBottom: `2px solid ${COLORS.border}`,
                  opacity: interpolate(hEnt, [0, 1], [0, 1]),
                }}
              >
                {[
                  { text: "条款", width: 240 },
                  { text: "风险", width: 100 },
                  { text: "问题", width: 380 },
                  { text: "法律依据", width: 240 },
                ].map((col, ci) => (
                  <div
                    key={col.text}
                    style={{
                      width: col.width,
                      padding: "16px 24px",
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.text,
                      borderRight: ci < 3 ? `1px solid ${COLORS.border}` : "none",
                    }}
                  >
                    {col.text}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Rows */}
          {reportItems.map((item, i) => {
            const delay = 15 + i * 8;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={item.clause}
                style={{
                  display: "flex",
                  borderBottom: i < reportItems.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [8, 0])}px)`,
                }}
              >
                <div style={{ width: 240, padding: "14px 24px", fontFamily: FONT_SANS, fontSize: 24, color: COLORS.text, borderRight: `1px solid ${COLORS.border}` }}>
                  {item.clause}
                </div>
                <div style={{ width: 100, padding: "14px 24px", borderRight: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.card,
                      background: item.riskColor,
                      padding: "2px 12px",
                      borderRadius: 4,
                    }}
                  >
                    {item.risk}
                  </div>
                </div>
                <div style={{ width: 380, padding: "14px 24px", fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, borderRight: `1px solid ${COLORS.border}` }}>
                  {item.issue}
                </div>
                <div style={{ width: 240, padding: "14px 24px", fontFamily: MONO, fontSize: 22, color: COLORS.accent }}>
                  {item.law}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary bar */}
        {(() => {
          const sumEnt = spring({ frame: frame - 60, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                display: "flex",
                gap: 40,
                opacity: interpolate(sumEnt, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(sumEnt, [0, 1], [15, 0])}px)`,
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.text }}>
                总计 <span style={{ fontFamily: MONO, fontWeight: 700 }}>5</span> 条审查意见
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.accent }}>
                高风险 <span style={{ fontFamily: MONO, fontWeight: 700 }}>3</span>
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: "#B8860B" }}>
                中风险 <span style={{ fontFamily: MONO, fontWeight: 700 }}>1</span>
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
                低风险 <span style={{ fontFamily: MONO, fontWeight: 700 }}>1</span>
              </div>
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
