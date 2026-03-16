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

const RENDER_CODE = [
  { text: "<ReactMarkdown", hl: true },
  { text: "  remarkPlugins={[remarkGfm]}", hl: true },
  { text: "  rehypePlugins={[rehypeHighlight]}", hl: true },
  { text: "  components={components}", hl: true },
  { text: ">", hl: false },
  { text: "  {content}", hl: false },
  { text: "</ReactMarkdown>", hl: false },
];

const CODE_DETECT = [
  { text: "code({ className, children, ...props }) {", hl: true },
  { text: "  const match = /language-(\\w+)/.exec(", hl: true },
  { text: "    className ?? ''", hl: false },
  { text: "  );", hl: false },
  { text: "  const isBlock = match !== null;", hl: true },
  { text: "  // isBlock \u2192 \u5757\u7ea7\u4ee3\u7801 + \u590d\u5236\u6309\u94ae", hl: false, comment: true },
  { text: "  // !isBlock \u2192 \u884c\u5185 code \u6837\u5f0f", hl: false, comment: true },
  { text: "}", hl: false },
];

export const SceneRender: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          markdown-renderer.tsx
        </div>

        {/* Two code panels side by side */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* ReactMarkdown usage panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 540,
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
              ReactMarkdown \u7ec4\u4ef6
            </div>
            {RENDER_CODE.map((line, i) => {
              const delay = 10 + i * 6;
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
                    fontSize: 21,
                    fontWeight: line.hl ? 700 : 400,
                    color: line.hl ? COLORS.text : COLORS.muted,
                    lineHeight: "34px",
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

          {/* Code element detection panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              width: 600,
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
              code \u5143\u7d20\u68c0\u6d4b
            </div>
            {CODE_DETECT.map((line, i) => {
              const delay = 45 + i * 5;
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
                frame: frame - 90,
                fps,
                config: { damping: 12, mass: 0.7 },
              });
              return (
                <div
                  style={{
                    marginTop: 14,
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    fontWeight: 600,
                    color: COLORS.accent,
                    textAlign: "center",
                    opacity: interpolate(noteProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(noteProg, [0, 1], [15, 0])}px)`,
                  }}
                >
                  language-* className \u2192 \u5757\u7ea7\u4ee3\u7801\u6e32\u67d3
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
