import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const codeLines = [
  { text: "// 实现 Extension 接口", color: COLORS.muted },
  { text: "function loggingExtension(): Extension {", color: COLORS.text },
  { text: "  return {", color: COLORS.text },
  { text: "    name: 'logging',", color: COLORS.accent },
  { text: "    systemPrompt: () =>", color: COLORS.text },
  { text: "      '每次操作后简要说明你做了什么',", color: COLORS.accent },
  { text: "    preToolUse: async (name, args) => {", color: COLORS.text },
  { text: "      console.log(`Tool: ${name}`);", color: COLORS.muted },
  { text: "      return { allowed: true };", color: COLORS.accent },
  { text: "    },", color: COLORS.text },
  { text: "  };", color: COLORS.text },
  { text: "}", color: COLORS.text },
];

export const SceneAkegExtension: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 32, paddingBottom: 140 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <div style={{
            fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>Extension</div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>— prompt 注入 + 工具拦截</div>
        </div>

        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
          padding: "24px 40px", boxShadow: COLORS.cardShadow,
        }}>
          {codeLines.map((line, i) => {
            const prog = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 14, mass: 0.4 } });
            return (
              <div key={i} style={{
                fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 23, lineHeight: 1.7, color: line.color,
                opacity: interpolate(prog, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
              }}>{line.text}</div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
