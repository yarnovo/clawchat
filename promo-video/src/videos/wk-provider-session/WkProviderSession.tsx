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

/* ---------- word files (TTS timestamps) ---------- */
import wkpsOverviewWords from "./words/wkps-overview-words.json";
import wkpsSchemaWords from "./words/wkps-schema-words.json";
import wkpsClassWords from "./words/wkps-class-words.json";

import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_WORDS = [wkpsOverviewWords, wkpsSchemaWords, wkpsClassWords];

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
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i] };
});

export const WK_PROVIDER_SESSION_FRAMES =
  scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

/* ================================================================
   Scene 1 — Overview: implements ChatSession, Drizzle + better-sqlite3
   ================================================================ */

const overviewCode = [
  `import { createRequire } from 'module';`,
  `import { drizzle } from 'drizzle-orm/better-sqlite3';`,
  `import { eq } from 'drizzle-orm';`,
  `import { messages } from './schema.js';`,
  `import type { ChatSession, ChatMessage }`,
  `  from '@agentkit/core';`,
  ``,
  `export class SQLiteSession`,
  `  implements ChatSession {`,
  `  private db: ReturnType<typeof drizzle>;`,
  `  private rawDb: any;`,
  `  private sessionId: string;`,
  `  ...`,
  `}`,
];

const features = [
  { icon: "DB", label: "better-sqlite3", desc: "嵌入式数据库" },
  { icon: "ORM", label: "Drizzle ORM", desc: "类型安全查询" },
  { icon: "IF", label: "ChatSession", desc: "接口实现" },
];

const SceneOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const featuresProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            transform: `scale(${titleScale})`,
          }}
        >
          provider-session-sqlite
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          ChatSession + Drizzle ORM + better-sqlite3
        </div>

        {/* Code block */}
        <div
          style={{
            display: "flex",
            gap: 36,
            marginTop: 12,
            alignItems: "flex-start",
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(26, 26, 26, 0.04)",
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              padding: "24px 32px",
              width: 640,
              boxShadow: COLORS.cardShadow,
            }}
          >
            {overviewCode.map((line, i) => {
              const lineDelay = 20 + i * 3;
              const lineProg = spring({
                frame: frame - lineDelay,
                fps,
                config: { damping: 18, mass: 0.4 },
              });
              const isImport = line.startsWith("import");
              const isClass = line.startsWith("export class") || line.startsWith("  implements");
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: isClass
                      ? COLORS.accent
                      : isImport
                        ? COLORS.muted
                        : COLORS.text,
                    lineHeight: 1.7,
                    whiteSpace: "pre",
                    minHeight: line === "" ? 8 : undefined,
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Feature cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              opacity: interpolate(featuresProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(featuresProg, [0, 1], [20, 0])}px)`,
            }}
          >
            {features.map((f, i) => {
              const cardProg = spring({
                frame: frame - 45 - i * 10,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    padding: "16px 24px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: interpolate(cardProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(cardProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.accent,
                      padding: "4px 12px",
                      borderRadius: 8,
                      background: "rgba(218,119,86,0.08)",
                    }}
                  >
                    {f.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 600, color: COLORS.text }}>
                      {f.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 15, color: COLORS.muted }}>
                      {f.desc}
                    </div>
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

/* ================================================================
   Scene 2 — schema.ts: Drizzle table definition
   ================================================================ */

const schemaCode = [
  `import { sqliteTable, text, integer }`,
  `  from 'drizzle-orm/sqlite-core';`,
  `import { sql } from 'drizzle-orm';`,
  ``,
  `export const messages = sqliteTable('messages', {`,
  `  id:         integer('id')`,
  `              .primaryKey({ autoIncrement: true }),`,
  `  sessionId:  text('session_id').notNull(),`,
  `  role:       text('role', {`,
  `    enum: ['system','user','assistant','tool']`,
  `  }).notNull(),`,
  `  content:    text('content').notNull(),`,
  `  toolCallId: text('tool_call_id'),`,
  `  toolCalls:  text('tool_calls'), // JSON string`,
  `  createdAt:  text('created_at')`,
  `              .default(sql\`(datetime('now'))\`),`,
  `});`,
  ``,
  `export type Message    = typeof messages.$inferSelect;`,
  `export type NewMessage = typeof messages.$inferInsert;`,
];

const columns = [
  { name: "id", type: "INTEGER PK", color: COLORS.accent },
  { name: "session_id", type: "TEXT", color: COLORS.text },
  { name: "role", type: "ENUM(4)", color: COLORS.text },
  { name: "content", type: "TEXT", color: COLORS.text },
  { name: "tool_call_id", type: "TEXT?", color: COLORS.muted },
  { name: "tool_calls", type: "JSON?", color: COLORS.muted },
];

const SceneSchema: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.8, 1])})`,
          }}
        >
          schema.ts
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Code block */}
          <div
            style={{
              background: "rgba(26, 26, 26, 0.04)",
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              padding: "20px 28px",
              width: 660,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
            }}
          >
            {schemaCode.map((line, i) => {
              const lineDelay = 12 + i * 2;
              const lineProg = spring({
                frame: frame - lineDelay,
                fps,
                config: { damping: 18, mass: 0.4 },
              });
              const isComment = line.includes("//");
              const isExportType = line.startsWith("export type");
              const isTableDef = line.includes("sqliteTable") || line.includes("});");
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    color: isComment
                      ? COLORS.subtle
                      : isExportType
                        ? COLORS.accent
                        : isTableDef
                          ? COLORS.accent
                          : COLORS.text,
                    lineHeight: 1.65,
                    whiteSpace: "pre",
                    minHeight: line === "" ? 8 : undefined,
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Table diagram */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              opacity: interpolate(tableProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(tableProg, [0, 1], [20, 0])}px)`,
            }}
          >
            {/* Table header */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.white,
                background: COLORS.accent,
                padding: "10px 28px",
                borderRadius: "12px 12px 0 0",
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              messages
            </div>
            {/* Columns */}
            {columns.map((col, i) => {
              const rowProg = spring({
                frame: frame - 44 - i * 6,
                fps,
                config: { damping: 14, mass: 0.5 },
              });
              const isLast = i === columns.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 24px",
                    background: COLORS.card,
                    borderLeft: `1px solid ${COLORS.border}`,
                    borderRight: `1px solid ${COLORS.border}`,
                    borderBottom: `1px solid ${COLORS.border}`,
                    borderRadius: isLast ? "0 0 12px 12px" : 0,
                    minWidth: 240,
                    opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 17,
                      fontWeight: 600,
                      color: col.color,
                    }}
                  >
                    {col.name}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      color: COLORS.subtle,
                      marginLeft: 20,
                    }}
                  >
                    {col.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================
   Scene 3 — SQLiteSession class: constructor, getMessages, addMessage
   ================================================================ */

const constructorCode = [
  `constructor(dbPath: string, sessionId?: string) {`,
  `  const require = createRequire(import.meta.url);`,
  `  const Database = require('better-sqlite3');`,
  `  this.rawDb = new Database(dbPath);`,
  `  this.db = drizzle(this.rawDb);`,
  `  this.sessionId = sessionId || 'default';`,
  ``,
  `  // 自动建表`,
  `  this.rawDb.exec(\``,
  `    CREATE TABLE IF NOT EXISTS messages (...)`,
  `    CREATE INDEX IF NOT EXISTS idx_session`,
  `      ON messages(session_id);`,
  `  \`);`,
  `}`,
];

const getMessagesCode = [
  `getMessages(): ChatMessage[] {`,
  `  const rows = this.db`,
  `    .select().from(messages)`,
  `    .where(eq(messages.sessionId, this.sessionId))`,
  `    .all();`,
  `  return rows.map(row => {`,
  `    const msg: ChatMessage = {`,
  `      role: row.role, content: row.content,`,
  `    };`,
  `    if (row.toolCalls)`,
  `      msg.tool_calls = JSON.parse(row.toolCalls);`,
  `    return msg;`,
  `  });`,
  `}`,
];

const addMessageCode = [
  `addMessage(message: ChatMessage): void {`,
  `  this.db.insert(messages).values({`,
  `    sessionId: this.sessionId,`,
  `    role:      message.role,`,
  `    content:   message.content,`,
  `    toolCalls: message.tool_calls`,
  `      ? JSON.stringify(message.tool_calls)`,
  `      : null,`,
  `  }).run();`,
  `}`,
];

const SceneClass: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  /* Stagger the three code blocks */
  const ctorProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const getProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const addProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  const CodeBlock: React.FC<{
    title: string;
    lines: string[];
    prog: number;
    accent?: boolean;
  }> = ({ title, lines, prog, accent }) => (
    <div
      style={{
        opacity: interpolate(prog, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        flex: 1,
      }}
    >
      {/* Method header */}
      <div
        style={{
          fontFamily: MONO,
          fontSize: 16,
          fontWeight: 700,
          color: COLORS.white,
          background: accent ? COLORS.accent : COLORS.text,
          padding: "6px 16px",
          borderRadius: "10px 10px 0 0",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: "rgba(26, 26, 26, 0.04)",
          border: `1px solid ${COLORS.border}`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "14px 16px",
          boxShadow: COLORS.cardShadow,
        }}
      >
        {lines.map((line, i) => {
          const isComment = line.trimStart().startsWith("//");
          return (
            <div
              key={i}
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: isComment ? COLORS.subtle : COLORS.text,
                lineHeight: 1.6,
                whiteSpace: "pre",
                minHeight: line === "" ? 6 : undefined,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );

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
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.85, 1])})`,
          }}
        >
          SQLiteSession
        </div>

        {/* Three code blocks side by side */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "100%",
            maxWidth: 1600,
          }}
        >
          <CodeBlock title="constructor" lines={constructorCode} prog={ctorProg} accent />
          <CodeBlock title="getMessages()" lines={getMessagesCode} prog={getProg} />
          <CodeBlock title="addMessage()" lines={addMessageCode} prog={addProg} />
        </div>

        {/* Key insight */}
        <div
          style={{
            display: "flex",
            gap: 28,
            marginTop: 8,
          }}
        >
          {[
            { label: "createRequire", desc: "ESM compat" },
            { label: "AUTO CREATE TABLE", desc: "零配置" },
            { label: "JSON.parse / stringify", desc: "toolCalls 序列化" },
          ].map((item, i) => {
            const tagProg = spring({
              frame: frame - 80 - i * 8,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.85, 1])})`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 14,
                    color: COLORS.muted,
                  }}
                >
                  {item.desc}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ================================================================
   Fade wrapper
   ================================================================ */

const FadeScene: React.FC<{
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
   Composition
   ================================================================ */

const SCENE_COMPS = [SceneOverview, SceneSchema, SceneClass];

export const WkProviderSession: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio
        src={staticFile("audio/wk-provider-session/wk-provider-session.mp3")}
        volume={0.9}
      />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        const Comp = SCENE_COMPS[i];

        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <FadeScene dur={seqDur} isLast={isLast}>
              <Comp />
              <AbsoluteFill style={{ zIndex: 100 }}>
                <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
              </AbsoluteFill>
            </FadeScene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
