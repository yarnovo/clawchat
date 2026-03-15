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

const tagsRow1 = ["网页搜索", "代码审查", "数据分析", "GitHub"];
const tagsRow2 = ["文件管理", "邮件处理", "日程安排", "翻译"];

export const SceneApSkills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const numProg = spring({ frame: frame - 12, fps, config: { damping: 12 } });
  const tagsProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const footProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          技能市场
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 72,
            fontWeight: 800,
            color: COLORS.accent,
            opacity: interpolate(numProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numProg, [0, 1], [0.5, 1])})`,
          }}
        >
          25,000+
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            {tagsRow1.map((tag) => (
              <div
                key={tag}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.text,
                  padding: "10px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {tagsRow2.map((tag) => (
              <div
                key={tag}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.text,
                  padding: "10px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          一句话安装，即装即用
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
