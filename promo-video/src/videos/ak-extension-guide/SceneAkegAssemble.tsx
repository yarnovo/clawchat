import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const lines = [
  { text: "new AgentRunner({", type: "struct" },
  { text: "  llm: new OpenAIProvider({...}),", type: "provider" },
  { text: "  session: new SQLiteSession('db'),", type: "provider" },
  { text: "  tools: [bash],", type: "provider" },
  { text: "})", type: "struct" },
  { text: "  .use(skillsExtension())", type: "extension" },
  { text: "  .use(memoryExtension())", type: "extension" },
  { text: "  .use(schedulerChannel())", type: "channel" },
  { text: "  .use(httpChannel({ port: 4000 }))", type: "channel" },
  { text: "  .start();", type: "struct" },
];

const typeColors: Record<string, string> = {
  struct: COLORS.text,
  provider: COLORS.accent,
  extension: "#8B7E74",
  channel: COLORS.muted,
};

const typeLabels: Record<string, string> = {
  provider: "Provider",
  extension: "Extension",
  channel: "Channel",
};

export const SceneAkegAssemble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, paddingBottom: 140 }}>
        <div style={{
          fontFamily: FONT, fontSize: 52, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
        }}>组装</div>

        <div style={{
          display: "flex", gap: 40, alignItems: "flex-start",
        }}>
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16,
            padding: "28px 40px", boxShadow: COLORS.cardShadow,
          }}>
            {lines.map((line, i) => {
              const prog = spring({ frame: frame - 10 - i * 5, fps, config: { damping: 14, mass: 0.4 } });
              return (
                <div key={i} style={{
                  fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 24, lineHeight: 1.8, color: typeColors[line.type],
                  fontWeight: line.type === "struct" ? 700 : 500,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                }}>{line.text}</div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
            {(["provider", "extension", "channel"] as const).map((type, i) => {
              const prog = spring({ frame: frame - 40 - i * 12, fps, config: { damping: 12 } });
              return (
                <div key={type} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: typeColors[type] }} />
                  <div style={{ fontFamily: MONO, whiteSpace: "pre" as const, fontSize: 24, color: typeColors[type], fontWeight: 600 }}>
                    {typeLabels[type]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
