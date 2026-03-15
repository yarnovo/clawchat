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

const features = [
  {
    title: "条款合法性审查",
    desc: "逐条分析合同条款\n判断是否符合现行法律",
    example: "违约金 > 损失 30% → 可请求调整",
  },
  {
    title: "风险等级标注",
    desc: "高/中/低三级标注\n优先处理高风险条款",
    example: "高风险: 无限连带担保责任",
  },
  {
    title: "法律依据引用",
    desc: "每条意见附带法条\n民法典、公司法等",
    example: "依据《民法典》第 585 条",
  },
  {
    title: "格式条款识别",
    desc: "自动识别格式条款\n提示加重对方责任的条款",
    example: "格式条款: 免除提供方主要义务",
  },
];

export const SceneFeatures: React.FC = () => {
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
          gap: 40,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          四大核心能力
        </div>

        {/* Feature grid 2x2 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 22,
            justifyContent: "center",
            maxWidth: 1400,
          }}
        >
          {features.map((f, i) => {
            const delay = 15 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={f.title}
                style={{
                  width: 620,
                  padding: "24px 30px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                  <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
                {/* Example in code style */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.text,
                    background: COLORS.bg,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    whiteSpace: "pre",
                  }}
                >
                  {f.example}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
