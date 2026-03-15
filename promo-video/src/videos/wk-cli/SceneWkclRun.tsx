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

const runnerCode = `const runner = new AgentRunner({
  workspace: abs,
  llm: createLLM(),
  session: new SQLiteSession(
    path.join(abs, '.agent-session.db')
  ),
})
  .use(skillsExtension({ builtinDir: BUILTIN_SKILLS_DIR }))
  .use(memoryExtension());

await runner.start();`;

const singleMode = `if (opts.message) {
  console.log(await runner.chat(opts.message));
  await runner.stop();
  return;
}`;

const interactiveMode = `const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = () => rl.question('> ', async (input) => {
  console.log(await runner.chat(input));
  ask();
});
ask();`;

export const SceneWkclRun: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const runnerProg = spring({ frame: frame - 14, fps, config: { damping: 14, mass: 0.7 } });
  const singleProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.7 } });
  const interProg = spring({ frame: frame - 60, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 60,
          paddingBottom: 140,
          gap: 28,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          <span style={{ color: COLORS.muted }}>$ agentkit </span>
          <span style={{ color: COLORS.accent }}>run</span>
        </div>

        {/* Three code panels side by side */}
        <div
          style={{
            display: "flex",
            gap: 28,
            padding: "0 60px",
            alignItems: "flex-start",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {/* AgentRunner creation */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "24px 28px",
              boxShadow: COLORS.cardShadow,
              flex: 1,
              maxWidth: 560,
              opacity: interpolate(runnerProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(runnerProg, [0, 1], [24, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 14,
                letterSpacing: 1,
              }}
            >
              Provider + Extension
            </div>
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 17,
                lineHeight: 1.65,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {runnerCode.split("\n").map((line, i) => {
                const isUse = line.trim().startsWith(".use(");
                const isNew = line.includes("new AgentRunner") || line.includes("new SQLiteSession");
                return (
                  <div key={i}>
                    <span
                      style={{
                        color: isUse
                          ? COLORS.accent
                          : isNew
                            ? COLORS.text
                            : COLORS.muted,
                        fontWeight: isUse || isNew ? 700 : 400,
                      }}
                    >
                      {line}
                    </span>
                  </div>
                );
              })}
            </pre>
          </div>

          {/* Right column: two modes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              flex: 1,
              maxWidth: 520,
            }}
          >
            {/* Single message mode */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "24px 28px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(singleProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(singleProg, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 14,
                  letterSpacing: 1,
                }}
              >
                -m 单消息模式
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 17,
                  lineHeight: 1.65,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {singleMode.split("\n").map((line, i) => (
                  <div key={i}>
                    <span
                      style={{
                        color: line.includes("runner.chat")
                          ? COLORS.accent
                          : COLORS.muted,
                        fontWeight: line.includes("runner.chat") ? 700 : 400,
                      }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </pre>
            </div>

            {/* Interactive readline */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "24px 28px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(interProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(interProg, [0, 1], [24, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 14,
                  letterSpacing: 1,
                }}
              >
                交互模式 readline
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {interactiveMode.split("\n").map((line, i) => {
                  const isChat = line.includes("runner.chat");
                  const isAsk = line.trim().startsWith("ask()");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isChat
                            ? COLORS.accent
                            : isAsk
                              ? COLORS.text
                              : COLORS.muted,
                          fontWeight: isChat || isAsk ? 700 : 400,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
