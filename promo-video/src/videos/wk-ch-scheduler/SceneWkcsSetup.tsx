import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, MONO } from "../../constants";

const setupCode = [
  { text: "setup: async (ctx: AgenticContext) => {", hl: true },
  { text: "  workDir = ctx.workDir;", hl: false },
  { text: "  loop = ctx.eventLoop;", hl: false },
  { text: "  tasks = loadTasks(workDir);", hl: true },
  { text: "  appendLog(workDir, `Started: ${tasks.length} tasks`);", hl: false },
  { text: "", hl: false },
  { text: "  // fs.watch HEARTBEAT.md for auto-reload", hl: false },
  { text: "  const hbFile = path.join(workDir, 'HEARTBEAT.md');", hl: false },
  { text: "  if (fs.existsSync(hbFile)) {", hl: false },
  { text: "    watcher = fs.watch(hbFile, () => {", hl: true },
  { text: "      tasks = loadTasks(workDir);", hl: true },
  { text: "      appendLog(workDir, `Reloaded: ${tasks.length} tasks`);", hl: false },
  { text: "    });", hl: false },
  { text: "  }", hl: false },
  { text: "", hl: false },
  { text: "  // cron polling every 60s", hl: false },
  { text: "  timer = setInterval(async () => {", hl: true },
  { text: "    const now = new Date();", hl: false },
  { text: "    for (const task of tasks) {", hl: false },
  { text: "      if (!task.nextRun || now < task.nextRun) continue;", hl: false },
  { text: "      await loop.push(createEvent('timer', 'scheduler', {", hl: true },
  { text: "        prompt: task.prompt,", hl: true },
  { text: "        taskName: task.name,", hl: true },
  { text: "      }));", hl: false },
  { text: "      task.nextRun = CronExpressionParser", hl: false },
  { text: "        .parse(task.cron).next().toDate();", hl: false },
  { text: "    }", hl: false },
  { text: "  }, POLL_INTERVAL); // 60_000", hl: true },
  { text: "}", hl: false },
];

export const SceneWkcsSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
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
          setup() 启动入口
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: "18px 26px",
            boxShadow: COLORS.cardShadow,
            maxWidth: 1100,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Terminal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              paddingBottom: 10,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27C93F" }} />
            <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted, marginLeft: 10 }}>
              setup — loadTasks / fs.watch / setInterval / createEvent
            </div>
          </div>

          {setupCode.map((line, i) => {
            const lineProg = spring({
              frame: frame - 15 - i * 1.5,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  color: line.hl ? COLORS.accent : COLORS.text,
                  fontWeight: line.hl ? 600 : 400,
                  whiteSpace: "pre",
                  lineHeight: 1.5,
                  background: line.hl ? "rgba(218,119,86,0.06)" : "transparent",
                  borderRadius: 4,
                  padding: "1px 4px",
                  minHeight: line.text === "" ? 10 : undefined,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [20, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
