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

const appendLogCode = [
  { text: "function appendLog(workDir: string, msg: string) {", hl: true },
  { text: "  const dir = path.join(workDir, 'logs');", hl: false },
  { text: "  fs.mkdirSync(dir, { recursive: true });", hl: false },
  { text: "  const ts = new Date().toISOString()", hl: false },
  { text: "    .replace('T', ' ').slice(0, 19);", hl: false },
  { text: "  fs.appendFileSync(", hl: true },
  { text: "    path.join(dir, 'scheduler.log'),", hl: true },
  { text: "    `[${ts}] ${msg}\\n`", hl: true },
  { text: "  );", hl: false },
  { text: "}", hl: false },
];

const logExamples = [
  { ts: "2026-03-16 09:00:00", msg: "Started: 3 tasks", icon: ">" },
  { ts: "2026-03-16 09:00:01", msg: "Skipped: \"report\": invalid cron", icon: "!" },
  { ts: "2026-03-16 09:01:00", msg: "Reloaded: 2 tasks", icon: "~" },
  { ts: "2026-03-16 10:00:00", msg: ">> daily-brief", icon: ">" },
  { ts: "2026-03-16 10:00:02", msg: "-- daily-brief", icon: "+" },
  { ts: "2026-03-16 18:00:00", msg: ">> weekly-report", icon: ">" },
  { ts: "2026-03-16 18:00:05", msg: "xx weekly-report: timeout", icon: "x" },
];

export const SceneWkcsLogging: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const logProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          appendLog 日志
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {/* Code card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "18px 24px",
              boxShadow: COLORS.cardShadow,
              minWidth: 520,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-40, 0])}px)`,
            }}
          >
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
                appendLog
              </div>
            </div>
            {appendLogCode.map((line, i) => {
              const lp = spring({ frame: frame - 15 - i * 3, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 17,
                    color: line.hl ? COLORS.accent : COLORS.text,
                    fontWeight: line.hl ? 600 : 400,
                    whiteSpace: "pre",
                    lineHeight: 1.6,
                    background: line.hl ? "rgba(218,119,86,0.06)" : "transparent",
                    borderRadius: 4,
                    padding: "1px 4px",
                    opacity: interpolate(lp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lp, [0, 1], [15, 0])}px)`,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* Log output card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: "18px 24px",
              boxShadow: COLORS.cardShadow,
              minWidth: 560,
              opacity: interpolate(logProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(logProg, [0, 1], [40, 0])}px)`,
            }}
          >
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
              <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted }}>
                logs/scheduler.log
              </div>
            </div>
            {logExamples.map((log, i) => {
              const lp = spring({ frame: frame - 55 - i * 5, fps, config: { damping: 14, mass: 0.5 } });
              const iconColor =
                log.icon === "x" ? "#D32F2F" :
                log.icon === "!" ? "#F9A825" :
                log.icon === "+" ? "#2E7D32" :
                log.icon === "~" ? "#1565C0" :
                COLORS.muted;
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    whiteSpace: "pre",
                    lineHeight: 1.7,
                    opacity: interpolate(lp, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lp, [0, 1], [15, 0])}px)`,
                  }}
                >
                  <span style={{ color: COLORS.subtle }}>[{log.ts}]</span>{" "}
                  <span style={{ color: iconColor, fontWeight: 600 }}>{log.msg}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 22,
            color: COLORS.muted,
            opacity: interpolate(
              spring({ frame: frame - 80, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
            marginTop: 8,
          }}
        >
          skip invalid / log errors / track every trigger
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
