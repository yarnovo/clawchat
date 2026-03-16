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

const COPY_CODE = [
  { text: "const handleCopy = useCallback(() => {", hl: true },
  { text: "  void navigator.clipboard.writeText(text);", hl: true },
  { text: "  setCopied(true);", hl: false },
  { text: "  clearTimeout(timerRef.current);", hl: false },
  { text: "  timerRef.current = setTimeout(", hl: false },
  { text: "    () => setCopied(false), 2000", hl: true },
  { text: "  );", hl: false },
  { text: "}, [text]);", hl: false },
];

const LANG_CODE = [
  { text: "// \u8bed\u8a00\u6807\u7b7e\u63d0\u53d6", hl: false, comment: true },
  { text: "const match = /language-(\\w+)/", hl: true, comment: false },
  { text: "  .exec(className ?? '');", hl: true, comment: false },
  { text: "// match[1] \u2192 'typescript' | 'python' ...", hl: false, comment: true },
];

const DARK_MODE_ITEMS = [
  { prop: "bg-muted/50", desc: "\u4ee3\u7801\u5757\u80cc\u666f", delay: 70 },
  { prop: "text-muted-foreground", desc: "\u8bed\u8a00\u6807\u7b7e\u8272", delay: 80 },
  { prop: "border-border", desc: "\u8fb9\u6846\u8272", delay: 90 },
];

export const SceneCopy: React.FC = () => {
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
          \u590d\u5236\u529f\u80fd + \u6697\u8272\u9002\u914d
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Copy function code panel */}
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
              CopyButton
            </div>
            {COPY_CODE.map((line, i) => {
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

            {/* Copy \u2192 Copied animation */}
            {(() => {
              const btnProg = spring({
                frame: frame - 55,
                fps,
                config: { damping: 10, mass: 0.6 },
              });
              const copiedProg = spring({
                frame: frame - 75,
                fps,
                config: { damping: 12, mass: 0.7 },
              });
              return (
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    justifyContent: "center",
                    opacity: interpolate(btnProg, [0, 1], [0, 1]),
                  }}
                >
                  <div
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      background: `${COLORS.border}`,
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      fontWeight: 600,
                      color: COLORS.muted,
                    }}
                  >
                    Copy
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.accent,
                      opacity: interpolate(copiedProg, [0, 1], [0, 1]),
                    }}
                  >
                    \u2192
                  </div>
                  <div
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      background: "#4CAF50",
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.white,
                      opacity: interpolate(copiedProg, [0, 1], [0, 1]),
                      transform: `scale(${interpolate(copiedProg, [0, 1], [0.7, 1])})`,
                    }}
                  >
                    Copied \u2713
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 16,
                      color: COLORS.muted,
                      opacity: interpolate(copiedProg, [0, 1], [0, 1]),
                    }}
                  >
                    2\u79d2\u540e\u6062\u590d
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right column: language extract + dark mode */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Language tag extract */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                padding: "20px 28px",
                width: 480,
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
                \u8bed\u8a00\u6807\u7b7e
              </div>
              {LANG_CODE.map((line, i) => {
                const delay = 45 + i * 7;
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

            {/* Dark mode CSS variables */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: COLORS.card,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                padding: "20px 28px",
                width: 480,
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.accent,
                  marginBottom: 4,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                CSS \u53d8\u91cf\u6697\u8272\u9002\u914d
              </div>
              {DARK_MODE_ITEMS.map((item, i) => {
                const prog = spring({
                  frame: frame - item.delay,
                  fps,
                  config: { damping: 12, mass: 0.7 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 3,
                        background: i === 0 ? "#2D2D2D" : i === 1 ? "#888" : "#444",
                        border: `1px solid ${COLORS.border}`,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        fontWeight: 600,
                        color: COLORS.text,
                        whiteSpace: "pre",
                      }}
                    >
                      {item.prop}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        color: COLORS.muted,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
