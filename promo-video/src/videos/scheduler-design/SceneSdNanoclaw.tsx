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

const schedTypes = [
  { type: "cron", desc: "Cron \u8868\u8FBE\u5F0F", example: "0 9 * * *" },
  { type: "interval", desc: "\u56FA\u5B9A\u6BEB\u79D2\u95F4\u9694", example: "3600000" },
  { type: "once", desc: "\u4E00\u6B21\u6027\u6267\u884C", example: "ISO timestamp" },
];

const flow = [
  "\u8F6E\u8BE2\u5FAA\u73AF\u68C0\u67E5 SQLite",
  "\u67E5\u5230\u5230\u671F\u4EFB\u52A1",
  "\u542F\u52A8\u5BB9\u5668\u8DD1 Agent",
  "\u7ED3\u679C\u53D1\u56DE\u804A\u5929\u7FA4",
  "\u66F4\u65B0 next_run \u65F6\u95F4",
];

export const SceneSdNanoclaw: React.FC = () => {
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
          gap: 24,
          paddingTop: 60,
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
          NanoClaw Scheduler
        </div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {"\u7B80\u6D01\u76F4\u63A5\uFF0C\u591F\u7528\u5C31\u597D"}
        </div>

        {/* Schedule types */}
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          {schedTypes.map((s, i) => {
            const d = spring({ frame: frame - 15 - i * 8, fps, config: { damping: 14 } });
            return (
              <div
                key={s.type}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  width: 250,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(d, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                    marginBottom: 6,
                  }}
                >
                  {s.type}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text, marginBottom: 4 }}>
                  {s.desc}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 16, color: COLORS.subtle }}>
                  {s.example}
                </div>
              </div>
            );
          })}
        </div>

        {/* Execution flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "20px 32px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(
              spring({ frame: frame - 45, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          {flow.map((step, i) => {
            const d = spring({ frame: frame - 50 - i * 6, fps, config: { damping: 14 } });
            return (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.text,
                    padding: "8px 14px",
                    background: "rgba(218,119,86,0.06)",
                    borderRadius: 8,
                    opacity: interpolate(d, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(d, [0, 1], [16, 0])}px)`,
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {step}
                </div>
                {i < flow.length - 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 20, color: COLORS.subtle }}>{"\u2192"}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Key feature: context mode */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 12,
          }}
        >
          {[
            { mode: "group", desc: "\u7FA4\u4E0A\u4E0B\u6587", detail: "\u5171\u4EAB\u7FA4\u7684 session" },
            { mode: "isolated", desc: "\u9694\u79BB\u4E0A\u4E0B\u6587", detail: "\u72EC\u7ACB\u6267\u884C\u4E0D\u5E72\u6270" },
          ].map((item, i) => {
            const d = spring({ frame: frame - 75 - i * 8, fps, config: { damping: 14 } });
            return (
              <div
                key={item.mode}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "14px 24px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(d, [0, 1], [16, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 22, color: COLORS.accent, marginBottom: 4 }}>
                  {item.mode}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text }}>
                  {item.desc}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.muted }}>
                  {item.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
