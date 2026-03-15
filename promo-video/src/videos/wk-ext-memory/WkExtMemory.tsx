import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { Subtitle } from "../../Subtitle";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

/* ── word files (empty until TTS generates them) ── */
import wkemOverviewWords from "./words/wkem-overview-words.json";
import wkemSetupWords from "./words/wkem-setup-words.json";
import wkemPostbashWords from "./words/wkem-postbash-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneOverview, SceneSetup, ScenePostBash];
const SCENE_WORDS = [wkemOverviewWords, wkemSetupWords, wkemPostbashWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, Comp: SCENE_COMPS[i], words: SCENE_WORDS[i] };
});

export const WK_EXT_MEMORY_FRAMES =
  scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

/* ── fade wrapper ── */
const SceneWrap: React.FC<{
  children: React.ReactNode;
  dur: number;
  isLast?: boolean;
}> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast
    ? 1
    : interpolate(frame, [dur - FADE, dur], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/* ================================================================
   Scene 1 — Overview: title + signature + flow diagram
   ================================================================ */

const OVERVIEW_CODE = [
  { text: "export function memoryExtension(", color: COLORS.text, accent: true },
  { text: "  opts: MemoryExtensionOptions = {}", color: COLORS.muted, accent: false },
  { text: "): Extension {", color: COLORS.text, accent: true },
  { text: '  const filename = opts.filename || "MEMORY.md";', color: COLORS.muted, accent: false },
  { text: "  const maxSize  = opts.maxSize  || 20_000;", color: COLORS.muted, accent: false },
  { text: '  let content = "";', color: COLORS.muted, accent: false },
  { text: "  return { name: 'memory', setup, systemPrompt, postBash };", color: COLORS.accent, accent: true },
  { text: "}", color: COLORS.text, accent: false },
];

function SceneOverview() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 12, fps, config: { damping: 12, mass: 0.8 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          extension-memory
        </div>

        {/* Badge row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(badgeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {["60 行", "零依赖", "热更新"].map((label) => (
            <div
              key={label}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "8px 20px",
                borderRadius: 24,
                background: `${COLORS.accent}12`,
                border: `1px solid ${COLORS.accent}33`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Code block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            padding: "24px 36px",
            width: 860,
          }}
        >
          {OVERVIEW_CODE.map((line, i) => {
            const delay = 20 + i * 6;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: line.accent ? 700 : 400,
                  color: line.color,
                  lineHeight: "36px",
                  whiteSpace: "pre",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
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
}

/* ================================================================
   Scene 2 — setup() + systemPrompt()
   ================================================================ */

const SETUP_CODE = [
  { text: "setup: async (ctx: AgenticContext) => {", hl: true },
  { text: '  filePath = path.join(ctx.workDir, filename);', hl: false },
  { text: "  if (fs.existsSync(filePath)) {", hl: false },
  { text: "    content = fs.readFileSync(filePath, 'utf-8').trim();", hl: true },
  { text: "    if (content.length > maxSize) {", hl: false },
  { text: "      content = content.slice(0, maxSize)", hl: true },
  { text: "               + '\\n[truncated]';", hl: true },
  { text: "    }", hl: false },
  { text: "  }", hl: false },
  { text: "},", hl: false },
];

const SYSPROMPT_CODE = [
  { text: "systemPrompt: () => {", hl: true },
  { text: "  if (!content) return undefined;", hl: false },
  { text: "  return `## Long-term Memory\\n\\n${content}`;", hl: true },
  { text: "},", hl: false },
];

function SceneSetup() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          setup() + systemPrompt()
        </div>

        {/* Two code panels side by side */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* setup panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 680,
            }}
          >
            {/* panel label */}
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              setup
            </div>
            {SETUP_CODE.map((line, i) => {
              const delay = 8 + i * 5;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 19,
                    fontWeight: line.hl ? 700 : 400,
                    color: line.hl ? COLORS.text : COLORS.muted,
                    lineHeight: "32px",
                    whiteSpace: "pre",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                    background: line.hl ? `${COLORS.accent}08` : "transparent",
                    borderRadius: 4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* systemPrompt panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 520,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 12,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              systemPrompt
            </div>
            {SYSPROMPT_CODE.map((line, i) => {
              const delay = 50 + i * 8;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 19,
                    fontWeight: line.hl ? 700 : 400,
                    color: line.hl ? COLORS.text : COLORS.muted,
                    lineHeight: "32px",
                    whiteSpace: "pre",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                    background: line.hl ? `${COLORS.accent}08` : "transparent",
                    borderRadius: 4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {line.text}
                </div>
              );
            })}

            {/* Flow note */}
            {(() => {
              const noteProg = spring({
                frame: frame - 85,
                fps,
                config: { damping: 12, mass: 0.7 },
              });
              return (
                <div
                  style={{
                    marginTop: 16,
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    fontWeight: 600,
                    color: COLORS.accent,
                    textAlign: "center",
                    opacity: interpolate(noteProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(noteProg, [0, 1], [15, 0])}px)`,
                  }}
                >
                  MEMORY.md → system prompt 每轮注入
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ================================================================
   Scene 3 — postBash() hook: hot reload
   ================================================================ */

const POSTBASH_CODE = [
  { text: "// post-bash: 如果 Agent 写了 MEMORY.md，热更新记忆", hl: false, comment: true },
  { text: "postBash: async (command) => {", hl: true, comment: false },
  { text: "  if (command.includes(filename)", hl: true, comment: false },
  { text: "      && (command.includes('>')", hl: true, comment: false },
  { text: "          || command.includes('tee'))) {", hl: true, comment: false },
  { text: "    if (fs.existsSync(filePath)) {", hl: false, comment: false },
  { text: "      content = fs.readFileSync(filePath, 'utf-8').trim();", hl: true, comment: false },
  { text: "      if (content.length > maxSize)", hl: false, comment: false },
  { text: "        content = content.slice(0, maxSize) + '\\n[truncated]';", hl: false, comment: false },
  { text: "    }", hl: false, comment: false },
  { text: "  }", hl: false, comment: false },
  { text: "},", hl: false, comment: false },
];

const HEURISTIC_EXAMPLES = [
  { cmd: 'echo "new fact" >> MEMORY.md', match: true },
  { cmd: "cat data | tee MEMORY.md", match: true },
  { cmd: "cat MEMORY.md", match: false },
];

function ScenePostBash() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
        {/* Title */}
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
          postBash() 热更新
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Code panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 740,
            }}
          >
            {POSTBASH_CODE.map((line, i) => {
              const delay = 8 + i * 4;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 19,
                    fontWeight: line.hl ? 700 : 400,
                    color: line.comment
                      ? `${COLORS.muted}99`
                      : line.hl
                        ? COLORS.text
                        : COLORS.muted,
                    fontStyle: line.comment ? "italic" : "normal",
                    lineHeight: "30px",
                    whiteSpace: "pre",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                    background: line.hl ? `${COLORS.accent}08` : "transparent",
                    borderRadius: 4,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* Heuristic examples panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 440,
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.accent,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              检测启发式
            </div>
            {HEURISTIC_EXAMPLES.map((ex, i) => {
              const delay = 55 + i * 12;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 12, mass: 0.7 },
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {/* match indicator */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: ex.match ? "#4CAF50" : "#E57373",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: FONT_SANS,
                      fontSize: 16,
                      fontWeight: 700,
                      color: COLORS.white,
                      flexShrink: 0,
                    }}
                  >
                    {ex.match ? "\u2713" : "\u2717"}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 17,
                      color: COLORS.text,
                      whiteSpace: "pre",
                    }}
                  >
                    {ex.cmd}
                  </div>
                </div>
              );
            })}

            {/* Hot reload badge */}
            {(() => {
              const badgeProg = spring({
                frame: frame - 95,
                fps,
                config: { damping: 10, mass: 0.6 },
              });
              return (
                <div
                  style={{
                    marginTop: 12,
                    textAlign: "center",
                    padding: "10px 24px",
                    borderRadius: 24,
                    background: COLORS.accent,
                    color: COLORS.white,
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 700,
                    boxShadow: "0 4px 20px rgba(218,119,86,0.3)",
                    opacity: interpolate(badgeProg, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(badgeProg, [0, 1], [0.5, 1])})`,
                  }}
                >
                  无需重启，实时生效
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ================================================================
   Main composition
   ================================================================ */

export const WkExtMemory: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <Audio
        src={staticFile("audio/wk-ext-memory/wk-ext-memory.mp3")}
        volume={0.9}
      />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <SceneWrap dur={seqDur} isLast={isLast}>
              <s.Comp />
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
              </AbsoluteFill>
            </SceneWrap>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
