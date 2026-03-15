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

const serveCode = `const runner = new AgentRunner({
  workspace: abs,
  llm: createLLM(),
  session: new SQLiteSession(
    path.join(abs, '.agent-session.db')
  ),
  strategy: opts.strategy as QueueStrategy,
  batchWindow: parseInt(opts.batchWindow),
})
  .use(skillsExtension({ builtinDir: BUILTIN_SKILLS_DIR }))
  .use(memoryExtension())
  .use(schedulerChannel())
  .use(httpChannel({ port: parseInt(opts.port) }));

await runner.start();`;

const signalCode = `process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await runner.stop();
  process.exit(0);
});`;

const layers = [
  { label: "AgentRunner", desc: "核心引擎", color: COLORS.text },
  { label: "skillsExtension", desc: "技能注入", color: COLORS.accent },
  { label: "memoryExtension", desc: "记忆加载", color: COLORS.accent },
  { label: "schedulerChannel", desc: "定时调度", color: COLORS.accent },
  { label: "httpChannel", desc: "HTTP 接口", color: COLORS.accent },
];

export const SceneWkclServe: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14, mass: 0.7 } });
  const layerBaseProg = spring({ frame: frame - 36, fps, config: { damping: 12, mass: 0.6 } });
  const sigProg = spring({ frame: frame - 70, fps, config: { damping: 14, mass: 0.7 } });

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
          paddingTop: 50,
          paddingBottom: 140,
          gap: 24,
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
          <span style={{ color: COLORS.accent }}>serve</span>
          <span style={{ color: COLORS.muted, fontSize: 32, marginLeft: 16 }}>
            完整组装
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 36,
            padding: "0 60px",
            width: "100%",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {/* Left: code block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              flex: 1,
              maxWidth: 680,
            }}
          >
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "24px 28px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(codeProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(codeProg, [0, 1], [24, 0])}px)`,
              }}
            >
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
                {serveCode.split("\n").map((line, i) => {
                  const isUse = line.trim().startsWith(".use(");
                  const isNew = line.includes("new AgentRunner");
                  const isStrategy = line.includes("strategy") || line.includes("batchWindow");
                  return (
                    <div key={i}>
                      <span
                        style={{
                          color: isUse
                            ? COLORS.accent
                            : isNew
                              ? COLORS.text
                              : isStrategy
                                ? COLORS.text
                                : COLORS.muted,
                          fontWeight: isUse || isNew ? 700 : isStrategy ? 600 : 400,
                        }}
                      >
                        {line}
                      </span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* SIGINT handler */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "20px 28px",
                boxShadow: COLORS.cardShadow,
                opacity: interpolate(sigProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(sigProg, [0, 1], [18, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.muted,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                graceful shutdown
              </div>
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: COLORS.muted,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {signalCode}
              </pre>
            </div>
          </div>

          {/* Right: layer stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: interpolate(layerBaseProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(layerBaseProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 8,
                letterSpacing: 2,
              }}
            >
              组装层次
            </div>
            {layers.map((layer, i) => {
              const delay = 40 + i * 10;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 12, mass: 0.5 },
              });
              return (
                <div
                  key={layer.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "16px 28px",
                    boxShadow: COLORS.cardShadow,
                    minWidth: 340,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [18, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: layer.color,
                    }}
                  >
                    {layer.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      color: COLORS.muted,
                    }}
                  >
                    {layer.desc}
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
