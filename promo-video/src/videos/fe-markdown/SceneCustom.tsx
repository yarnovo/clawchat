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

const CUSTOM_RENDERERS = [
  { element: "a", behavior: "target=\"_blank\"", icon: "\u2197", delay: 15 },
  { element: "img", behavior: "max-width: 100%", icon: "\ud83d\uddbc\ufe0f", delay: 27 },
  { element: "table", behavior: "border-collapse + \u8fb9\u6846", icon: "\ud83d\udcca", delay: 39 },
  { element: "blockquote", behavior: "\u5de6\u4fa7\u6a59\u8272\u7ad6\u7ebf", icon: "\u275d", delay: 51 },
  { element: "code", behavior: "\u884c\u5185 / \u5757\u7ea7\u533a\u5206", icon: "\uf3b6", delay: 63 },
];

const THEME_FEATURES = [
  { label: "\u6697\u8272\u4e3b\u9898", desc: "CSS \u53d8\u91cf\u81ea\u52a8\u5207\u6362", delay: 75 },
  { label: "\u54cd\u5e94\u5f0f", desc: "overflow-x-auto", delay: 85 },
];

export const SceneCustom: React.FC = () => {
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
          \u81ea\u5b9a\u4e49\u6e32\u67d3\u5668
        </div>

        <div style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
          {/* Element renderers */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              background: COLORS.card,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "24px 28px",
              width: 520,
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
              components
            </div>
            {CUSTOM_RENDERERS.map((item, i) => {
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
                    transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: i % 2 === 0 ? `${COLORS.accent}06` : "transparent",
                  }}
                >
                  <div style={{ fontSize: 24, width: 32, textAlign: "center" }}>
                    {item.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.text,
                      width: 130,
                      whiteSpace: "pre",
                    }}
                  >
                    {`<${item.element}>`}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.muted,
                      whiteSpace: "pre",
                    }}
                  >
                    {item.behavior}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blockquote + theme preview */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Blockquote preview */}
            {(() => {
              const quoteProg = spring({
                frame: frame - 55,
                fps,
                config: { damping: 12, mass: 0.8 },
              });
              return (
                <div
                  style={{
                    background: COLORS.card,
                    borderRadius: 14,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    padding: "24px 28px",
                    width: 440,
                    opacity: interpolate(quoteProg, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(quoteProg, [0, 1], [0.85, 1])})`,
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
                      marginBottom: 12,
                    }}
                  >
                    blockquote preview
                  </div>
                  <div
                    style={{
                      borderLeft: `4px solid ${COLORS.accent}`,
                      paddingLeft: 16,
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      color: COLORS.muted,
                      fontStyle: "italic",
                      lineHeight: 1.6,
                    }}
                  >
                    \u201c\u667a\u80fd\u4f53\u662f\u4eba\u7c7b\u80fd\u529b\u7684\u5ef6\u4f38\uff0c
                    <br />
                    \u800c\u975e\u66ff\u4ee3\u3002\u201d
                  </div>
                </div>
              );
            })()}

            {/* Theme features */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: COLORS.card,
                borderRadius: 14,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                padding: "20px 28px",
                width: 440,
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
                \u4e3b\u9898\u9002\u914d
              </div>
              {THEME_FEATURES.map((feat, i) => {
                const prog = spring({
                  frame: frame - feat.delay,
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
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        background: "#4CAF50",
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
                      \u2713
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {feat.label}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        color: COLORS.muted,
                        whiteSpace: "pre",
                      }}
                    >
                      {feat.desc}
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
