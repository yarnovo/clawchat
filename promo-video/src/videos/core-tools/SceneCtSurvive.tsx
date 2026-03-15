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

const tools = [
  { name: "bash", icon: "$_", desc: "执行命令，万能瑞士军刀" },
  { name: "read", icon: "R", desc: "读取文件，输入的基础" },
  { name: "write", icon: "W", desc: "写入文件，输出的基础" },
  { name: "web_search", icon: "?", desc: "搜索网页，获取外部知识" },
  { name: "web_fetch", icon: "F", desc: "抓取网页，解析内容" },
];

export const SceneCtSurvive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 8,
          }}
        >
          <span style={{ color: COLORS.accent }}>第一层</span> · 生存
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", width: 1200 }}>
          {tools.map((tool, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={tool.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "28px 32px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 200,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 36,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: `${COLORS.accent}12`,
                    border: `1px solid ${COLORS.accent}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {tool.icon}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {tool.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  {tool.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
