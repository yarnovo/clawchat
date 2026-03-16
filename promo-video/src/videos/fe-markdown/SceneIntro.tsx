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

const PLUGINS = [
  { name: "react-markdown", desc: "Markdown \u2192 React", delay: 20 },
  { name: "remark-gfm", desc: "\u8868\u683c / \u4efb\u52a1\u5217\u8868", delay: 32 },
  { name: "rehype-highlight", desc: "\u4ee3\u7801\u8bed\u6cd5\u9ad8\u4eae", delay: 44 },
];

const CODE_BLOCK_LINES = [
  { text: "```typescript", color: COLORS.muted },
  { text: "const agent = new Agent({", color: COLORS.text },
  { text: '  name: "assistant",', color: COLORS.accent },
  { text: "  model: gpt4o,", color: COLORS.accent },
  { text: "});", color: COLORS.text },
  { text: "```", color: COLORS.muted },
];

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 68,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Markdown \u6e32\u67d3
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent \u56de\u590d\u7684\u5bcc\u6587\u672c\u6e32\u67d3\u65b9\u6848
        </div>

        {/* Plugin cards + code block row */}
        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {/* Plugin stack */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {PLUGINS.map((plugin, i) => {
              const prog = spring({
                frame: frame - plugin.delay,
                fps,
                config: { damping: 12, mass: 0.7 },
              });
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "18px 28px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                    width: 380,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.accent,
                      whiteSpace: "pre",
                    }}
                  >
                    {plugin.name}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                    }}
                  >
                    {plugin.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Code block preview with copy button + language tag */}
          {(() => {
            const blockProg = spring({
              frame: frame - 55,
              fps,
              config: { damping: 12, mass: 0.8 },
            });
            return (
              <div
                style={{
                  position: "relative",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 32px",
                  width: 460,
                  opacity: interpolate(blockProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(blockProg, [0, 1], [0.85, 1])})`,
                }}
              >
                {/* Language tag */}
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 16,
                    fontFamily: MONO,
                    fontSize: 13,
                    fontWeight: 600,
                    color: `${COLORS.muted}99`,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  typescript
                </div>

                {/* Copy button */}
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: `${COLORS.border}88`,
                    fontFamily: FONT_SANS,
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.muted,
                  }}
                >
                  \u2398 Copy
                </div>

                {/* Code lines */}
                <div style={{ marginTop: 24 }}>
                  {CODE_BLOCK_LINES.map((line, i) => {
                    const lineDelay = 60 + i * 5;
                    const lineProg = spring({
                      frame: frame - lineDelay,
                      fps,
                      config: { damping: 14, mass: 0.6 },
                    });
                    return (
                      <div
                        key={i}
                        style={{
                          fontFamily: MONO,
                          fontSize: 20,
                          fontWeight: 400,
                          color: line.color,
                          lineHeight: "34px",
                          whiteSpace: "pre",
                          opacity: interpolate(lineProg, [0, 1], [0, 1]),
                          transform: `translateX(${interpolate(lineProg, [0, 1], [15, 0])}px)`,
                        }}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
