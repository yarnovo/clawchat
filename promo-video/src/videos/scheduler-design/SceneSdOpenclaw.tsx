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

const schedules = [
  { kind: "at", desc: "一次性定时", example: '{ kind: "at", at: "2026-03-15T09:00:00Z" }' },
  { kind: "every", desc: "固定间隔", example: '{ kind: "every", everyMs: 3600000 }' },
  { kind: "cron", desc: "Cron 表达式", example: '{ kind: "cron", expr: "0 9 * * *", tz: "Asia/Shanghai" }' },
];

const payloads = [
  { kind: "systemEvent", desc: "注入主会话", detail: "text 文本注入" },
  { kind: "agentTurn", desc: "隔离会话", detail: "完整 Agent 执行" },
];

export const SceneSdOpenclaw: React.FC = () => {
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
          OpenClaw Cron
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
          {"\u529F\u80FD\u6700\u5168\u7684\u8C03\u5EA6\u7CFB\u7EDF"}
        </div>

        {/* Schedule types */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 8,
          }}
        >
          {schedules.map((s, i) => {
            const d = spring({ frame: frame - 15 - i * 8, fps, config: { damping: 14 } });
            return (
              <div
                key={s.kind}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                  width: 280,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(d, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(d, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                    marginBottom: 6,
                  }}
                >
                  {s.kind}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                    marginBottom: 8,
                  }}
                >
                  {s.desc}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: COLORS.subtle,
                    lineHeight: 1.5,
                    wordBreak: "break-all" as const,
                  }}
                >
                  {s.example}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payload + Delivery */}
        <div style={{ display: "flex", gap: 30, marginTop: 12 }}>
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "16px 24px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(
                spring({ frame: frame - 50, fps, config: { damping: 14 } }),
                [0, 1], [0, 1],
              ),
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Payload {"\u7C7B\u578B"}
            </div>
            {payloads.map((p) => (
              <div
                key={p.kind}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    color: COLORS.accent,
                    background: "rgba(218,119,86,0.08)",
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  {p.kind}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text }}>
                  {p.desc}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.muted }}>
                  {p.detail}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "16px 24px",
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(
                spring({ frame: frame - 60, fps, config: { damping: 14 } }),
                [0, 1], [0, 1],
              ),
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.text,
                marginBottom: 12,
              }}
            >
              Delivery {"\u6A21\u5F0F"}
            </div>
            {["announce \u2192 \u804A\u5929\u9891\u9053", "webhook \u2192 HTTP \u56DE\u8C03", "none \u2192 \u4EC5\u6267\u884C"].map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 20,
                  color: COLORS.text,
                  marginBottom: 8,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
