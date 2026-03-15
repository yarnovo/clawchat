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
  { name: "skill_search", icon: "S?", desc: "搜索技能市场" },
  { name: "skill_install", icon: "S+", desc: "安装新技能" },
  { name: "tool_list", icon: "TL", desc: "查看已有工具" },
  { name: "memory_write", icon: "MW", desc: "写入记忆" },
  { name: "memory_read", icon: "MR", desc: "读取记忆" },
];

export const SceneCtEvolve: React.FC = () => {
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
          <span style={{ color: "#5B8DEF" }}>第二层</span> · 进化
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
                    fontSize: 32,
                    fontWeight: 700,
                    color: "#5B8DEF",
                    width: 64,
                    height: 64,
                    borderRadius: 14,
                    background: "#5B8DEF12",
                    border: "1px solid #5B8DEF30",
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
