import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const codeLines = [
  { text: "function authExtension(): Extension {", color: COLORS.text },
  { text: "  return {", color: COLORS.text },
  { text: "    name: 'auth',", color: COLORS.text },
  { text: "    systemPrompt: () =>", color: COLORS.accent },
  { text: "      '禁止执行 rm -rf 和 sudo 命令',", color: COLORS.muted },
  { text: "    preBash: async (command) => {", color: COLORS.accent },
  { text: "      if (command.includes('rm -rf'))", color: COLORS.text },
  { text: "        return { allowed: false,", color: COLORS.accent },
  { text: "          reason: '危险命令' };", color: COLORS.accent },
  { text: "      return { allowed: true };", color: COLORS.text },
  { text: "    },", color: COLORS.text },
  { text: "    postBash: async (cmd, out, err) => {", color: COLORS.accent },
  { text: "      console.log(`[audit] ${cmd}`);", color: COLORS.muted },
  { text: "    },", color: COLORS.text },
  { text: "  };", color: COLORS.text },
  { text: "}", color: COLORS.text },
];

export const SceneAkdgExtension: React.FC = () => {
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
          }}>扩展点 4: Extension</div>
          <div style={{
            fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}>— prompt 注入 + bash 拦截</div>
        </div>

        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
          padding: "24px 40px", boxShadow: COLORS.cardShadow,
        }}>
          {codeLines.map((line, i) => {
            const prog = spring({ frame: frame - 10 - i * 4, fps, config: { damping: 14, mass: 0.4 } });
            return (
              <div key={i} style={{
                fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 22, lineHeight: 1.7, color: line.color,
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
