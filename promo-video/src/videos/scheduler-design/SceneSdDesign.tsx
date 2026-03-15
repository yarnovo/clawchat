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

const comparison = [
  { dim: "\u8C03\u5EA6\u683C\u5F0F", openclaw: "at / every / cron + \u65F6\u533A", nanoclaw: "cron / interval / once", ironclaw: "cron / event / system_event / manual" },
  { dim: "\u6267\u884C\u65B9\u5F0F", openclaw: "\u4E3B\u4F1A\u8BDD / \u9694\u79BB\u4F1A\u8BDD", nanoclaw: "\u7EDF\u4E00\u5BB9\u5668\u6267\u884C", ironclaw: "lightweight / full_job" },
  { dim: "\u7ED3\u679C\u5904\u7406", openclaw: "announce + webhook", nanoclaw: "\u76F4\u63A5\u53D1\u6D88\u606F", ironclaw: "notify channel" },
  { dim: "\u62BD\u8C61\u5C42\u7EA7", openclaw: "CronJob", nanoclaw: "ScheduledTask", ironclaw: "Routine" },
];

const headers = ["\u7EF4\u5EA6", "OpenClaw", "NanoClaw", "IronClaw"];
const colWidths = [140, 280, 240, 280];

export const SceneSdDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const principleProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingTop: 50,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          {"\u4E09\u8005\u5BF9\u6BD4 \u00B7 \u6211\u4EEC\u7684\u8BBE\u8BA1"}
        </div>

        {/* Comparison table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "14px 24px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {headers.map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: idx === 0 ? FONT_SANS : MONO,
                  fontSize: 24,
                  fontWeight: 600,
                  color: idx === 0 ? COLORS.muted : COLORS.accent,
                  width: colWidths[idx],
                  flexShrink: 0,
                  textAlign: idx === 0 ? "left" : "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {comparison.map((row, i) => {
            const delay = 12 + i * 6;
            const rowProg = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const values = [row.dim, row.openclaw, row.nanoclaw, row.ironclaw];

            return (
              <div
                key={row.dim}
                style={{
                  display: "flex",
                  padding: "12px 24px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                {values.map((val, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: idx === 0 ? 22 : 19,
                      fontWeight: idx === 0 ? 600 : 400,
                      color: idx === 0 ? COLORS.muted : COLORS.text,
                      width: colWidths[idx],
                      flexShrink: 0,
                      textAlign: idx === 0 ? "left" : "center",
                    }}
                  >
                    {val}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Design principle */}
        <div
          style={{
            display: "flex",
            gap: 20,
            opacity: interpolate(principleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(principleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              borderRadius: 12,
              padding: "14px 24px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: COLORS.accent, marginBottom: 4 }}>
              ClawChat {"\u539F\u5219"}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.text }}>
              {"\u5BF9\u7528\u6237\u7B80\u5355\uFF0C\u5BF9\u7CFB\u7EDF\u7075\u6D3B"}
            </div>
          </div>
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "14px 24px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.text }}>
              {"\u7528\u6237\u8BF4\u201C\u6BCF\u5929\u4E5D\u70B9\u63D0\u9192\u6211\u201D"}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted, marginTop: 4 }}>
              Agent {"\u81EA\u52A8\u7FFB\u8BD1\u6210"} cron {"\u8868\u8FBE\u5F0F"}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
