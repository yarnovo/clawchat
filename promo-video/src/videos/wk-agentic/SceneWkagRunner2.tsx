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

const kw = (t: string) => ({ text: t, color: "#7C3AED" });
const tp = (t: string) => ({ text: t, color: "#0891B2" });
const fn = (t: string) => ({ text: t, color: COLORS.accent });
const st = (t: string) => ({ text: t, color: "#059669" });
const cm = (t: string) => ({ text: t, color: COLORS.subtle });
const pl = (t: string) => ({ text: t, color: COLORS.text });

type Token = { text: string; color: string };

const bridgeCode: Token[][] = [
  [cm("// 4. 桥接：EventLoop → Agent")],
  [kw("this"), pl(".loop."), fn("onProcess"), pl("("), kw("async"), pl(" (events: "), tp("AgentEvent"), pl("[]) => {")],
  [pl("  "), kw("const"), pl(" parts = events.map(e => {")],
  [pl("    "), kw("if"), pl(" (e.type === "), st("'message'"), pl(") "), kw("return"), pl(" e.payload.text;")],
  [pl("    "), kw("if"), pl(" (e.type === "), st("'timer'"), pl(")   "), kw("return"), pl(" "), st("`[定时: ${e.payload.taskName}]`"), pl(";")],
  [pl("    "), kw("return"), pl(" "), st("`[${e.type}:${e.source}] ...`"), pl(";")],
  [pl("  });")],
  [pl("  "), kw("return"), pl(" "), kw("this"), pl(".agent."), fn("run"), pl("(parts.join("), st("'\\n'"), pl("));")],
  [pl("});")],
];

const hooksCode: Token[][] = [
  [cm("// Agent 构造时传入的 bash hooks")],
  [fn("onBeforeBash"), pl(": "), kw("async"), pl(" (command) => {")],
  [pl("  "), kw("for"), pl(" ("), kw("const"), pl(" ext "), kw("of"), pl(" "), kw("this"), pl(".extensions) {")],
  [pl("    "), kw("const"), pl(" r = "), kw("await"), pl(" ext."), fn("preBash"), pl("?.(command);")],
  [pl("    "), kw("if"), pl(" (r && !r.allowed)")],
  [pl("      "), kw("return"), pl(" { allowed: "), kw("false"), pl(", reason: "), st("`${ext.name}: ${r.reason}`"), pl(" };")],
  [pl("  }")],
  [pl("  "), kw("return"), pl(" { allowed: "), kw("true"), pl(" };")],
  [pl("},")],
  [pl("")],
  [fn("onAfterBash"), pl(": "), kw("async"), pl(" (command, output, isError) => {")],
  [pl("  "), kw("for"), pl(" ("), kw("const"), pl(" ext "), kw("of"), pl(" "), kw("this"), pl(".extensions)")],
  [pl("    "), kw("await"), pl(" ext."), fn("postBash"), pl("?.(command, output, isError);")],
  [pl("},")],
];

const CodeBlock: React.FC<{
  title: string;
  lines: Token[][];
  delay: number;
  width?: number;
}> = ({ title, lines, delay, width = 860 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blockProg = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: COLORS.cardShadow,
        padding: "20px 28px",
        width,
        opacity: interpolate(blockProg, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(blockProg, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.accent,
          marginBottom: 10,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      {lines.map((tokens, li) => {
        const lineProg = spring({
          frame: frame - delay - 4 - li * 2,
          fps,
          config: { damping: 14, mass: 0.5 },
        });
        return (
          <div
            key={li}
            style={{
              fontFamily: MONO,
              fontSize: 19,
              lineHeight: "30px",
              whiteSpace: "pre",
              opacity: interpolate(lineProg, [0, 1], [0, 1]),
            }}
          >
            {tokens.map((tok, ti) => (
              <span key={ti} style={{ color: tok.color }}>
                {tok.text}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

/* ---- Flow diagram showing the glue ---- */
const flowItems = [
  { label: "EventLoop", sub: "events 进入" },
  { label: "onProcess", sub: "格式化文本" },
  { label: "Agent.run()", sub: "LLM 思考+行动" },
  { label: "Extensions", sub: "preBash / postBash" },
];

export const SceneWkagRunner2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 18,
          paddingTop: 44,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            marginBottom: 4,
          }}
        >
          runner.ts &mdash; The Bridge
        </div>

        {/* Flow diagram */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          {flowItems.map((item, i) => {
            const delay = 6 + i * 8;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    background: i === 2 ? COLORS.accent : COLORS.card,
                    color: i === 2 ? COLORS.white : COLORS.text,
                    border: `1px solid ${i === 2 ? COLORS.accent : COLORS.border}`,
                    borderRadius: 12,
                    padding: "12px 20px",
                    textAlign: "center",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 14,
                      color: i === 2 ? "rgba(255,255,255,0.8)" : COLORS.muted,
                      marginTop: 4,
                    }}
                  >
                    {item.sub}
                  </div>
                </div>
                {i < flowItems.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Two code blocks side by side */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <CodeBlock
            title="loop.onProcess → agent.run()"
            lines={bridgeCode}
            delay={12}
            width={680}
          />
          <CodeBlock
            title="Extensions → Agent bash hooks"
            lines={hooksCode}
            delay={28}
            width={680}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
