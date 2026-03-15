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

const archFlow = [
  { label: "agent-server", sub: "scheduler \u6A21\u5757" },
  { label: "PostgreSQL", sub: "\u4EFB\u52A1\u5B9A\u4E49 + \u6267\u884C\u65E5\u5FD7" },
  { label: "openclaw \u5BB9\u5668", sub: "Agent \u6267\u884C" },
  { label: "im-server", sub: "\u7ED3\u679C\u63A8\u9001\u7ED9\u7528\u6237" },
];

const dbSchema = [
  { col: "id", type: "uuid", note: "PK" },
  { col: "agent_id", type: "uuid", note: "FK \u2192 agents" },
  { col: "name", type: "text", note: "\u4EFB\u52A1\u540D" },
  { col: "schedule_type", type: "enum", note: "cron | interval" },
  { col: "schedule_value", type: "text", note: "\u8868\u8FBE\u5F0F / \u6BEB\u79D2\u6570" },
  { col: "prompt", type: "text", note: "\u6267\u884C\u6307\u4EE4" },
  { col: "next_run_at", type: "timestamptz", note: "\u4E0B\u6B21\u6267\u884C\u65F6\u95F4" },
  { col: "status", type: "enum", note: "active | paused" },
];

export const SceneSdImpl: React.FC = () => {
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
          {"\u5B9E\u73B0\u65B9\u6848"}
        </div>

        {/* Architecture flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 4,
          }}
        >
          {archFlow.map((item, i) => {
            const d = spring({ frame: frame - 12 - i * 8, fps, config: { damping: 14 } });
            return (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${i === 0 ? COLORS.accent : COLORS.border}`,
                    borderRadius: 12,
                    padding: "14px 20px",
                    boxShadow: COLORS.cardShadow,
                    textAlign: "center" as const,
                    opacity: interpolate(d, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(d, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: COLORS.accent }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 17, color: COLORS.muted, marginTop: 4 }}>
                    {item.sub}
                  </div>
                </div>
                {i < archFlow.length - 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.subtle }}>{"\u2192"}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* DB schema table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            marginTop: 8,
            opacity: interpolate(
              spring({ frame: frame - 45, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 20,
              fontWeight: 600,
              color: COLORS.accent,
              padding: "10px 24px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            agent_scheduled_tasks
          </div>
          <div style={{ display: "flex", padding: "8px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
            {["Column", "Type", "Note"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.muted,
                  width: idx === 0 ? 180 : idx === 1 ? 160 : 220,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>
          {dbSchema.map((row, i) => {
            const d = spring({ frame: frame - 50 - i * 3, fps, config: { damping: 14, mass: 0.5 } });
            return (
              <div
                key={row.col}
                style={{
                  display: "flex",
                  padding: "6px 24px",
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                  opacity: interpolate(d, [0, 1], [0, 1]),
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 17, color: COLORS.text, width: 180, flexShrink: 0 }}>
                  {row.col}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 17, color: COLORS.subtle, width: 160, flexShrink: 0 }}>
                  {row.type}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 17, color: COLORS.muted, width: 220, flexShrink: 0 }}>
                  {row.note}
                </div>
              </div>
            );
          })}
        </div>

        {/* MVP badge */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.accent,
            background: "rgba(218,119,86,0.08)",
            padding: "10px 28px",
            borderRadius: 20,
            marginTop: 4,
            opacity: interpolate(
              spring({ frame: frame - 80, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          {"\u5148\u505A MVP\uFF0C\u590D\u6742\u529F\u80FD\u540E\u7EED\u8FED\u4EE3"}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
