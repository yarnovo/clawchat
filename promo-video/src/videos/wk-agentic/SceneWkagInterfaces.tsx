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

/* ---------- Syntax-colored code lines ---------- */

const kw = (t: string) => ({ text: t, color: "#7C3AED" });  // purple keywords
const tp = (t: string) => ({ text: t, color: "#0891B2" });  // teal types
const fn = (t: string) => ({ text: t, color: COLORS.accent }); // orange fn names
const cm = (t: string) => ({ text: t, color: COLORS.subtle }); // gray comments
const pl = (t: string) => ({ text: t, color: COLORS.text }); // plain

type Token = { text: string; color: string };

const channelCode: Token[][] = [
  [cm("// Channel — 连接外部世界")],
  [kw("export interface "), tp("Channel"), pl(" {")],
  [pl("  "), fn("name"), pl(": "), tp("string"), pl(";")],
  [pl("  "), fn("setup"), pl("(ctx: "), tp("AgenticContext"), pl("): "), tp("Promise"), pl("<"), tp("void"), pl(">;")],
  [pl("  "), fn("teardown"), pl("?(): "), tp("Promise"), pl("<"), tp("void"), pl(">;")],
  [pl("  "), fn("info"), pl("?(): "), tp("Record"), pl("<"), tp("string"), pl(", "), tp("unknown"), pl(">;")],
  [pl("}")],
];

const extensionCode: Token[][] = [
  [cm("// Extension — 增强 Agent 行为")],
  [kw("export interface "), tp("Extension"), pl(" {")],
  [pl("  "), fn("name"), pl(": "), tp("string"), pl(";")],
  [pl("  "), fn("setup"), pl("?(ctx: "), tp("AgenticContext"), pl("): "), tp("Promise"), pl("<"), tp("void"), pl(">;")],
  [pl("  "), fn("systemPrompt"), pl("?(): "), tp("string"), pl(" | "), tp("undefined"), pl(";")],
  [pl("  "), fn("preBash"), pl("?(command: "), tp("string"), pl("): "), tp("Promise"), pl("<"), tp("HookResult"), pl(">;")],
  [pl("  "), fn("postBash"), pl("?(cmd: "), tp("string"), pl(", out: "), tp("string"), pl(", err: "), tp("boolean"), pl("): "), tp("Promise"), pl("<"), tp("void"), pl(">;")],
  [pl("}")],
];

const contextCode: Token[][] = [
  [kw("export interface "), tp("AgenticContext"), pl(" {")],
  [pl("  "), fn("workDir"), pl(": "), tp("string"), pl(";")],
  [pl("  "), fn("eventLoop"), pl(": "), tp("EventLoop"), pl(";")],
  [pl("}")],
];

const CodeBlock: React.FC<{
  title: string;
  lines: Token[][];
  delay: number;
  width?: number;
}> = ({ title, lines, delay, width = 820 }) => {
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
          marginBottom: 12,
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
              fontSize: 20,
              lineHeight: "32px",
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

export const SceneWkagInterfaces: React.FC = () => {
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
          gap: 20,
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          interfaces.ts
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <CodeBlock title="Channel" lines={channelCode} delay={8} width={680} />
            <CodeBlock title="AgenticContext" lines={contextCode} delay={40} width={680} />
          </div>
          <CodeBlock title="Extension" lines={extensionCode} delay={24} width={680} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
