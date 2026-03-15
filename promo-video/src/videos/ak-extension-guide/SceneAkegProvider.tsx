import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const codeLines = [
  { text: "// 实现 LLMProvider 接口", color: COLORS.muted },
  { text: "class MyProvider implements LLMProvider {", color: COLORS.text },
  { text: "  async chat(messages, tools) {", color: COLORS.text },
  { text: "    // 调用你的模型 API", color: COLORS.muted },
  { text: "    return { content, tool_calls };", color: COLORS.accent },
  { text: "  }", color: COLORS.text },
  { text: "}", color: COLORS.text },
];

export const SceneAkegProvider: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, paddingBottom: 140 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{
            fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.accent,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>Provider</div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>— 实现 Core 接口，注入构造函数</div>
        </div>

        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
          padding: "32px 48px", boxShadow: COLORS.cardShadow,
        }}>
          {codeLines.map((line, i) => {
            const prog = spring({ frame: frame - 12 - i * 6, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div key={i} style={{
                fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 26, lineHeight: 1.8, color: line.color,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
              }}>{line.text}</div>
            );
          })}
        </div>

        {(() => {
          const usageProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });
          return (
            <div style={{
              fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 28, color: COLORS.text, fontWeight: 600,
              opacity: interpolate(usageProg, [0, 1], [0, 1]),
            }}>
              new AgentRunner({"{"} llm: <span style={{ color: COLORS.accent }}>new MyProvider()</span> {"}"})
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
