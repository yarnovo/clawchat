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

const verticals = [
  { industry: "法律", example: "合同审查 Agent" },
  { industry: "电商", example: "数据分析 Agent" },
  { industry: "教育", example: "教案生成 Agent" },
];

export const SceneBizSkill: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const dataProg = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.8 } });
  const cardsProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const footProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          生态维度 · MCP 蓝海
        </div>

        {/* 大字数据 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(dataProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(dataProg, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            19,000+ Server
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 36,
              color: COLORS.accent,
              fontWeight: 600,
            }}
          >
            &lt; 5% 已变现
          </div>
        </div>

        {/* 垂直行业卡片 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {verticals.map((v, i) => {
            const delay = 30 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={v.industry}
                style={{
                  padding: "24px 36px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {v.industry}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {v.example}
                </div>
              </div>
            );
          })}
        </div>

        {/* 85% 分成标注 */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            color: COLORS.accent,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
          }}
        >
          开发者分成：85%
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
