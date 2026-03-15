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

const triggers = [
  { type: "cron", desc: "\u5B9A\u65F6\u8C03\u5EA6", detail: "\u516D\u5B57\u6BB5\u542B\u79D2\u7EA7" },
  { type: "event", desc: "\u6D88\u606F\u5339\u914D", detail: "Regex \u5339\u914D\u5165\u7AD9\u6D88\u606F" },
  { type: "system_event", desc: "\u7ED3\u6784\u5316\u4E8B\u4EF6", detail: "source + type + filters" },
  { type: "manual", desc: "\u624B\u52A8\u89E6\u53D1", detail: "\u5DE5\u5177\u8C03\u7528\u6216 CLI" },
];

const actions = [
  { type: "lightweight", desc: "\u5355\u8F6E LLM \u8C03\u7528", features: ["\u5FEB\u901F\u54CD\u5E94", "\u53EF\u9009\u5DE5\u5177\u8C03\u7528", "max_tool_rounds \u9650\u5236"] },
  { type: "full_job", desc: "\u591A\u6B65\u9AA4\u5E26\u5DE5\u5177", features: ["\u591A\u8F6E\u8FED\u4EE3", "\u9884\u6388\u6743\u5DE5\u5177\u5217\u8868", "\u8C03\u5EA6\u5668\u6D3E\u53D1"] },
];

export const SceneSdIronclaw: React.FC = () => {
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
          IronClaw Routine
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
          {"\u6700\u7075\u6D3B\u7684\u89E6\u53D1\u5668\u7CFB\u7EDF"}
        </div>

        {/* Trigger types - 2x2 grid */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 16, justifyContent: "center", maxWidth: 800 }}>
          {triggers.map((t, i) => {
            const d = spring({ frame: frame - 12 - i * 6, fps, config: { damping: 14 } });
            return (
              <div
                key={t.type}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "14px 20px",
                  width: 370,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(d, [0, 1], [24, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 600,
                      color: COLORS.accent,
                    }}
                  >
                    {t.type}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text }}>
                    {t.desc}
                  </div>
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 17, color: COLORS.muted }}>
                  {t.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action types */}
        <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
          {actions.map((a, i) => {
            const d = spring({ frame: frame - 50 - i * 10, fps, config: { damping: 14 } });
            return (
              <div
                key={a.type}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "16px 24px",
                  width: 340,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(d, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: COLORS.accent, marginBottom: 8 }}>
                  {a.type}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text, marginBottom: 8 }}>
                  {a.desc}
                </div>
                {a.features.map((f) => (
                  <div key={f} style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.muted, marginBottom: 4 }}>
                    {"\u2022"} {f}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Guardrails badge */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 4,
            opacity: interpolate(
              spring({ frame: frame - 75, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          {["cooldown \u51B7\u5374", "max_concurrent \u5E76\u53D1\u9650\u5236", "notify \u901A\u77E5\u6E20\u9053"].map((badge) => (
            <div
              key={badge}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.accent,
                background: "rgba(218,119,86,0.08)",
                padding: "6px 16px",
                borderRadius: 20,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
