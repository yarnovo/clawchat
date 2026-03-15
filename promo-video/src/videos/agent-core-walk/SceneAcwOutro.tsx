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
  { name: "agent.ts", role: "while 循环" },
  { name: "llm.ts", role: "模型接口" },
  { name: "openai-provider.ts", role: "百炼适配" },
  { name: "persona.ts", role: "人格加载" },
  { name: "types.ts", role: "工具定义" },
  { name: "memory.ts", role: "聊天历史" },
];

export const SceneAcwOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const gridProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          六文件架构总览
        </div>

        {/* 3x2 grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            justifyContent: "center",
            maxWidth: 1200,
            opacity: interpolate(gridProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(gridProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {modules.map((m, i) => {
            const delay = 15 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isCore = i === 0; // agent.ts highlighted
            return (
              <div
                key={m.name}
                style={{
                  padding: "24px 36px",
                  borderRadius: 14,
                  background: isCore
                    ? `linear-gradient(135deg, ${COLORS.card}, rgba(218, 119, 86, 0.06))`
                    : COLORS.card,
                  border: isCore
                    ? `2px solid ${COLORS.accent}`
                    : `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 260,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: isCore ? COLORS.accent : COLORS.text,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {m.role}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.accent,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [16, 0])}px)`,
          }}
        >
          300 行代码 · 模型无关 · 百炼 qwen-plus 验证通过
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
