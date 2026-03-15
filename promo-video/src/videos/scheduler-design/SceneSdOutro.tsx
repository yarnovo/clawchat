import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const takeaways = [
  { from: "NanoClaw", what: "\u7B80\u6D01\u67B6\u6784\uFF1A\u8F6E\u8BE2 + SQLite + \u5BB9\u5668\u6267\u884C" },
  { from: "OpenClaw", what: "\u8C03\u5EA6\u683C\u5F0F\uFF1Acron + interval + \u65F6\u533A\u652F\u6301" },
  { from: "IronClaw", what: "\u6267\u884C\u5206\u5C42\uFF1A\u8F7B\u91CF\u5FEB\u901F / \u5168\u529F\u80FD Job" },
];

export const SceneSdOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {"\u53D6\u5404\u5BB6\u6240\u957F"}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 2,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {"\u88AB\u52A8\u5E94\u7B54 \u2192 \u4E3B\u52A8\u670D\u52A1"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          {takeaways.map((t, i) => {
            const d = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 14 } });
            return (
              <div
                key={t.from}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "14px 28px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(d, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {t.from}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.text,
                  }}
                >
                  {t.what}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.accent,
            padding: "12px 32px",
            borderRadius: 12,
            background: "rgba(218,119,86,0.08)",
            marginTop: 8,
            opacity: interpolate(
              spring({ frame: frame - 70, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          {"\u5148 MVP \u518D\u8FED\u4EE3\uFF0C\u8FD9\u5C31\u662F\u6211\u4EEC\u7684\u8DEF\u5F84"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
