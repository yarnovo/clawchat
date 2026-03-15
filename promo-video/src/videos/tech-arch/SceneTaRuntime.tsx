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

const modules = [
  {
    title: "agent-core",
    subtitle: "while loop + tool call",
    items: ["消息循环", "工具调用", "上下文管理"],
  },
  {
    title: "Provider",
    subtitle: "OpenAI 兼容",
    items: ["百炼", "DeepSeek", "GPT"],
  },
  {
    title: "工具系统",
    subtitle: "可插拔",
    items: ["技能市场", "动态安装", "热加载"],
  },
];

export const SceneTaRuntime: React.FC = () => {
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
          gap: 36,
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
          }}
        >
          Agent 运行时
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {modules.map((m, i) => {
            const delay = 12 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={m.title}
                style={{
                  width: 380,
                  padding: "32px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {m.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {m.subtitle}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: COLORS.border,
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                  {m.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 26,
                        color: COLORS.text,
                        padding: "6px 18px",
                        borderRadius: 8,
                        background: "#F5F0EB",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
