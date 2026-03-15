import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

type CodeLine = {
  text: string;
  color: string;
  bold?: boolean;
};

const codeLines: CodeLine[] = [
  { text: "const runner = new AgentRunner({", color: COLORS.text },
  { text: "  // Provider: 注入核心依赖", color: COLORS.muted },
  { text: "  llm: new OpenAIProvider({...}),", color: COLORS.accent },
  { text: "  session: new SQLiteSession('db'),", color: COLORS.accent },
  { text: "})", color: COLORS.text },
  { text: "  // Extension: 增强行为", color: COLORS.muted },
  { text: "  .use(skillsExtension())", color: COLORS.text },
  { text: "  .use(memoryExtension())", color: COLORS.text },
  { text: "  .use(authExtension())    // 你写的!", color: COLORS.text, bold: true },
  { text: "  // Channel: 连接外部", color: COLORS.muted },
  { text: "  .use(httpChannel())", color: COLORS.muted },
  { text: "  .use(myChannel())        // 你写的!", color: COLORS.muted, bold: true },
  { text: "  .start();", color: COLORS.text },
];

const legend = [
  { label: "Provider", color: COLORS.accent },
  { label: "Extension", color: COLORS.text },
  { label: "Channel", color: COLORS.muted },
];

export const SceneAkdgAssemble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 32, paddingBottom: 140 }}>
        {/* Title */}
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
        }}>
          组装
        </div>

        {/* Code card + Legend row */}
        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Code card */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
            padding: "28px 40px", boxShadow: COLORS.cardShadow,
          }}>
            {codeLines.map((line, i) => {
              const prog = spring({ frame: frame - 10 - i * 3, fps, config: { damping: 14, mass: 0.4 } });
              const isComment = line.text.trimStart().startsWith("//");
              const hasYouWrote = line.text.includes("你写的!");

              // Split lines that contain "你写的!" for special rendering
              if (hasYouWrote) {
                const parts = line.text.split("// 你写的!");
                return (
                  <div key={i} style={{
                    fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 20, lineHeight: 1.7,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                  }}>
                    <span style={{ color: line.color }}>{parts[0]}</span>
                    <span style={{ color: COLORS.accent, fontWeight: 700 }}>{"// 你写的!"}</span>
                  </div>
                );
              }

              return (
                <div key={i} style={{
                  fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 20, lineHeight: 1.7,
                  color: isComment ? COLORS.muted : line.color,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                }}>{line.text}</div>
              );
            })}
          </div>

          {/* Legend */}
          {(() => {
            const legendProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
            return (
              <div style={{
                display: "flex", flexDirection: "column", gap: 20, paddingTop: 28,
                opacity: interpolate(legendProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(legendProg, [0, 1], [20, 0])}px)`,
              }}>
                {legend.map((item, i) => {
                  const dotProg = spring({ frame: frame - 55 - i * 8, fps, config: { damping: 14, mass: 0.5 } });
                  return (
                    <div key={item.label} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      opacity: interpolate(dotProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(dotProg, [0, 1], [12, 0])}px)`,
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%",
                        backgroundColor: item.color,
                      }} />
                      <div style={{
                        fontFamily: FONT_SANS, fontSize: 22, color: item.color, fontWeight: 600,
                      }}>{item.label}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
