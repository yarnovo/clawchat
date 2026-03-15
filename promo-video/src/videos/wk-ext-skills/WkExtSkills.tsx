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

import wkesOverviewWords from "./words/wkes-overview-words.json";
import wkesLoadingWords from "./words/wkes-loading-words.json";
import wkesAllskillsWords from "./words/wkes-allskills-words.json";
import wkesExtensionWords from "./words/wkes-extension-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_WORDS = [wkesOverviewWords, wkesLoadingWords, wkesAllskillsWords, wkesExtensionWords];

const SCENES = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], startMs: t.startMs };
});

export const WK_EXT_SKILLS_FRAMES = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;

/* ------------------------------------------------------------------ */
/*  Scene 1 — Overview: Extension implementation                      */
/* ------------------------------------------------------------------ */

const overviewCode = [
  { text: "export interface Skill {", hl: true },
  { text: "  name: string;", hl: false },
  { text: "  dir: string;", hl: false },
  { text: "  prompt: string;", hl: false },
  { text: "  scripts: { name: string; path: string }[];", hl: false },
  { text: "  hooks: { event: string; path: string }[];", hl: false },
  { text: "}", hl: true },
];

const overviewDirs = [
  { label: "SKILL.md", desc: "Prompt" },
  { label: "scripts/", desc: "Bash" },
  { label: "hooks/", desc: "Lifecycle" },
];

const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          extension-skills
        </div>

        {/* Code card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "32px 48px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {overviewCode.map((line, i) => {
            const delay = 14 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  lineHeight: "44px",
                  color: line.hl ? COLORS.accent : COLORS.text,
                  fontWeight: line.hl ? 700 : 400,
                  whiteSpace: "pre",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-16, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* Three pillars */}
        <div style={{ display: "flex", gap: 48 }}>
          {overviewDirs.map((item, i) => {
            const delay = 60 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2 — loadSkillDir: scan SKILL.md, scripts/, hooks/           */
/* ------------------------------------------------------------------ */

const loadSkillCode = [
  { text: "function loadSkillDir(dir: string): Skill | null {", hl: true },
  { text: "  const md = path.join(dir, 'SKILL.md');", hl: false },
  { text: "  if (!fs.existsSync(md)) return null;", hl: false },
  { text: "  const prompt = fs.readFileSync(md, 'utf-8').trim();", hl: false },
  { text: "", hl: false },
  { text: "  // scripts/ \u2014 collect executable files", hl: false },
  { text: "  for (const f of fs.readdirSync(scriptsDir))", hl: false },
  { text: "    scripts.push({ name: f, path: ... });", hl: false },
  { text: "", hl: false },
  { text: "  // hooks/ \u2014 HOOK_EVENTS mapping", hl: false },
  { text: "  for (const f of HOOK_EVENTS)", hl: false },
  { text: "    hooks.push({ event: f.replace('.sh',''), ... });", hl: false },
  { text: "}", hl: true },
];

const hookEvents = ["setup.sh", "teardown.sh", "pre-tool.sh", "post-tool.sh"];

const SceneLoading: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingTop: 80,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          loadSkillDir()
        </div>

        {/* Code block */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "28px 44px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {loadSkillCode.map((line, i) => {
            const delay = 10 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  lineHeight: "38px",
                  color: line.hl ? COLORS.accent : line.text.startsWith("  //") ? COLORS.muted : COLORS.text,
                  fontWeight: line.hl ? 700 : 400,
                  whiteSpace: "pre",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* HOOK_EVENTS chips */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {hookEvents.map((ev, i) => {
            const delay = 80 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
            return (
              <div
                key={ev}
                style={{
                  fontFamily: MONO,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.accent,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "10px 24px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [12, 0])}px)`,
                }}
              >
                {ev}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3 — loadAllSkills: workspace first, builtin fallback        */
/* ------------------------------------------------------------------ */

const allSkillsCode = [
  { text: "function loadAllSkills(workDir, builtinDir?) {", hl: true },
  { text: "  const loaded = new Set<string>();", hl: false },
  { text: "", hl: false },
  { text: "  // 1. workspace skills/", hl: false },
  { text: "  for (const e of fs.readdirSync(wsDir)) {", hl: false },
  { text: "    const s = loadSkillDir(p);", hl: false },
  { text: "    if (s) { skills.push(s); loaded.add(s.name); }", hl: false },
  { text: "  }", hl: false },
  { text: "", hl: false },
  { text: "  // 2. builtin fallback (dedup)", hl: false },
  { text: "  for (const e of fs.readdirSync(builtinDir)) {", hl: false },
  { text: "    if (loaded.has(e)) continue;  // skip!", hl: true },
  { text: "    const s = loadSkillDir(p);", hl: false },
  { text: "    if (s) { skills.push(s); loaded.add(s.name); }", hl: false },
  { text: "  }", hl: false },
  { text: "}", hl: true },
];

const SceneAllSkills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingTop: 80,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          loadAllSkills()
        </div>

        {/* Code block */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "28px 44px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {allSkillsCode.map((line, i) => {
            const delay = 10 + i * 6;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  lineHeight: "38px",
                  color: line.hl ? COLORS.accent : line.text.startsWith("  //") ? COLORS.muted : COLORS.text,
                  fontWeight: line.hl ? 700 : 400,
                  whiteSpace: "pre",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* Priority diagram */}
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[
            { label: "workspace/skills/", primary: true },
            { label: "builtin/", primary: false },
          ].map((item, i) => {
            const delay = 90 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {">"}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: item.primary ? COLORS.accent : COLORS.muted,
                    background: COLORS.card,
                    border: `2px solid ${item.primary ? COLORS.accent : COLORS.border}`,
                    borderRadius: 14,
                    padding: "12px 28px",
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [16, 0])}px)`,
                  }}
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 4 — skillsExtension: setup, systemPrompt, pre/postBash     */
/* ------------------------------------------------------------------ */

const extensionCode = [
  { text: "export function skillsExtension(opts): Extension {", hl: true },
  { text: "  return {", hl: false },
  { text: "    name: 'skills',", hl: false },
  { text: "", hl: false },
  { text: "    setup: async (ctx) => {", hl: true },
  { text: "      skills = loadAllSkills(ctx.workDir, opts.builtinDir);", hl: false },
  { text: "      personaSections = loadPersonaFiles(ctx.workDir);", hl: false },
  { text: "    },", hl: false },
  { text: "", hl: false },
  { text: "    systemPrompt: () =>", hl: true },
  { text: "      [...personaSections, ...skills.map(s => s.prompt)]", hl: false },
  { text: "", hl: false },
  { text: "    preBash: async (command) => {", hl: true },
  { text: "      // spawnSync('bash', [hook], { input: JSON })", hl: false },
  { text: "      // exit 0 = allowed, exit 2 = blocked", hl: false },
  { text: "    },", hl: false },
  { text: "  };", hl: false },
  { text: "}", hl: true },
];

const lifecycleSteps = [
  { label: "setup", desc: "loadAllSkills + loadPersonaFiles" },
  { label: "systemPrompt", desc: "merge persona + skill prompts" },
  { label: "preBash", desc: "spawnSync hook, exit 0/2" },
  { label: "postBash", desc: "notify hook after execution" },
];

const SceneExtension: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          skillsExtension()
        </div>

        <div style={{ display: "flex", gap: 36, alignItems: "flex-start" }}>
          {/* Code block */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 20,
              padding: "24px 36px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              maxWidth: 860,
            }}
          >
            {extensionCode.map((line, i) => {
              const delay = 8 + i * 5;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 19,
                    lineHeight: "34px",
                    color: line.hl ? COLORS.accent : line.text.startsWith("      //") ? COLORS.muted : COLORS.text,
                    fontWeight: line.hl ? 700 : 400,
                    whiteSpace: "pre",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-12, 0])}px)`,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* Lifecycle steps */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              paddingTop: 8,
            }}
          >
            {lifecycleSteps.map((step, i) => {
              const delay = 40 + i * 14;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
              return (
                <div
                  key={step.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "14px 24px",
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 16,
                      color: COLORS.muted,
                      whiteSpace: "pre",
                    }}
                  >
                    {step.desc}
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

/* ------------------------------------------------------------------ */
/*  Composition                                                       */
/* ------------------------------------------------------------------ */

const SCENE_COMPS = [SceneOverview, SceneLoading, SceneAllSkills, SceneExtension];

const SceneWrapper: React.FC<{
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

export const WkExtSkills: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
    <Audio src={staticFile("audio/wk-ext-skills/wk-ext-skills.mp3")} volume={0.9} />
    {SCENES.map((s, i) => {
      const isLast = i === SCENES.length - 1;
      const seqDur = isLast ? s.dur : s.dur + FADE;
      const Comp = SCENE_COMPS[i];
      const sceneStartMs = (s.from / FPS) * 1000;
      return (
        <Sequence key={i} from={s.from} durationInFrames={seqDur}>
          <SceneWrapper dur={seqDur} isLast={isLast}>
            <Comp />
            <AbsoluteFill style={{ zIndex: 100 }}>
              <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
            </AbsoluteFill>
          </SceneWrapper>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
