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

const constructorCode: Token[][] = [
  [kw("class "), tp("AgentRunner"), pl(" {")],
  [pl("  "), kw("private "), fn("channels"), pl(": "), tp("Channel"), pl("[] = [];")],
  [pl("  "), kw("private "), fn("extensions"), pl(": "), tp("Extension"), pl("[] = [];")],
  [pl("  "), kw("private "), fn("loop"), pl(": "), tp("EventLoop"), pl(";")],
  [pl("")],
  [pl("  "), kw("constructor"), pl("(opts: "), tp("AgentRunnerOptions"), pl(") {")],
  [pl("    "), kw("this"), pl(".workspace = path.resolve(opts.workspace);")],
  [pl("    "), kw("this"), pl(".loop = "), kw("new "), tp("EventLoop"), pl("({")],
  [pl("      strategy: opts.strategy || "), st("'sequential'"), pl(",")],
  [pl("    });")],
  [pl("  }")],
  [pl("}")],
];

const useCode: Token[][] = [
  [cm("// 鸭子类型检查：有 systemPrompt/preBash/postBash → Extension")],
  [kw("function "), fn("isExtension"), pl("(x: "), tp("Channel | Extension"), pl("): x "), kw("is "), tp("Extension"), pl(" {")],
  [pl("  "), kw("return "), st("'systemPrompt'"), pl(" "), kw("in"), pl(" x || "), st("'preBash'"), pl(" "), kw("in"), pl(" x || "), st("'postBash'"), pl(" "), kw("in"), pl(" x;")],
  [pl("}")],
  [pl("")],
  [fn("use"), pl("(plugin: "), tp("Channel | Extension"), pl("): "), tp("this"), pl(" {")],
  [pl("  "), kw("if"), pl(" (isExtension(plugin)) "), kw("this"), pl(".extensions.push(plugin);")],
  [pl("  "), kw("else"), pl(" "), kw("this"), pl(".channels.push(plugin "), kw("as "), tp("Channel"), pl(");")],
  [pl("  "), kw("return this"), pl(";")],
  [pl("}")],
];

const startCode: Token[][] = [
  [kw("async "), fn("start"), pl("(): "), tp("Promise"), pl("<"), tp("void"), pl("> {")],
  [pl("  "), cm("// 1. Setup Extensions + Channels")],
  [pl("  "), kw("for"), pl(" ("), kw("const"), pl(" ext "), kw("of"), pl(" "), kw("this"), pl(".extensions) "), kw("await"), pl(" ext.setup?.(ctx);")],
  [pl("  "), kw("for"), pl(" ("), kw("const"), pl(" ch  "), kw("of"), pl(" "), kw("this"), pl(".channels)   "), kw("await"), pl(" ch.setup(ctx);")],
  [pl("")],
  [pl("  "), cm("// 2. 收集 system prompt")],
  [pl("  "), kw("const"), pl(" prompts = "), kw("this"), pl(".extensions")],
  [pl("    .map(e => e.systemPrompt?.())")],
  [pl("    .filter(Boolean);")],
  [pl("  "), kw("const"), pl(" systemPrompt = prompts.join("), st("'\\n\\n'"), pl(");")],
  [pl("")],
  [pl("  "), cm("// 3. 创建 Agent（传入 bash hooks）")],
  [pl("  "), kw("this"), pl(".agent = "), kw("new "), tp("Agent"), pl("({ llm, systemPrompt, ... });")],
  [pl("}")],
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
        padding: "16px 24px",
        width,
        opacity: interpolate(blockProg, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(blockProg, [0, 1], [20, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 16,
          fontWeight: 600,
          color: COLORS.accent,
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      {lines.map((tokens, li) => {
        const lineProg = spring({
          frame: frame - delay - 3 - li * 1.5,
          fps,
          config: { damping: 14, mass: 0.5 },
        });
        return (
          <div
            key={li}
            style={{
              fontFamily: MONO,
              fontSize: 18,
              lineHeight: "28px",
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

export const SceneWkagRunner1: React.FC = () => {
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
          gap: 14,
          paddingTop: 48,
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
          runner.ts &mdash; constructor / use / start
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <CodeBlock title="constructor" lines={constructorCode} delay={6} width={620} />
            <CodeBlock title="use() + isExtension" lines={useCode} delay={24} width={620} />
          </div>
          <CodeBlock title="start()" lines={startCode} delay={16} width={660} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
