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

const schemaFields = [
  { name: "id", type: "uuid", desc: "PRIMARY KEY" },
  { name: "user_id", type: "uuid", desc: "FK \u2192 users" },
  { name: "agent_id", type: "uuid", desc: "FK \u2192 agents" },
  { name: "type", type: "enum", desc: "chat | token | skill_install" },
  { name: "quantity", type: "integer", desc: "\u7528\u91CF\u6570\u503C" },
  { name: "created_at", type: "timestamp", desc: "\u8BB0\u5F55\u65F6\u95F4" },
];

const monthlyBars = [
  { month: "Jan", value: 45 },
  { month: "Feb", value: 72 },
  { month: "Mar", value: 58 },
  { month: "Apr", value: 91 },
  { month: "May", value: 120 },
  { month: "Jun", value: 85 },
];

export const SceneSvbUsage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const maxVal = Math.max(...monthlyBars.map((b) => b.value));

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          usage_records
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Schema table */}
          <div
            style={{
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            {(() => {
              const hProg = spring({ frame: frame - 8, fps, config: { damping: 14, mass: 0.7 } });
              return (
                <div
                  style={{
                    display: "flex",
                    borderBottom: `2px solid ${COLORS.border}`,
                    opacity: interpolate(hProg, [0, 1], [0, 1]),
                  }}
                >
                  <div style={{ width: 180, padding: "14px 20px", fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, whiteSpace: "pre" as const }}>
                    field
                  </div>
                  <div style={{ width: 140, padding: "14px 20px", fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, borderLeft: `1px solid ${COLORS.border}`, whiteSpace: "pre" as const }}>
                    type
                  </div>
                  <div style={{ width: 260, padding: "14px 20px", fontFamily: FONT_SANS, fontSize: 22, fontWeight: 700, color: COLORS.accent, borderLeft: `1px solid ${COLORS.border}` }}>
                    note
                  </div>
                </div>
              );
            })()}
            {/* Rows */}
            {schemaFields.map((f, i) => {
              const delay = 15 + i * 6;
              const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
              return (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    borderBottom: i < schemaFields.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [10, 0])}px)`,
                  }}
                >
                  <div style={{ width: 180, padding: "12px 20px", fontFamily: MONO, fontSize: 20, fontWeight: 600, color: COLORS.text, whiteSpace: "pre" as const }}>
                    {f.name}
                  </div>
                  <div style={{ width: 140, padding: "12px 20px", fontFamily: MONO, fontSize: 20, color: COLORS.muted, borderLeft: `1px solid ${COLORS.border}`, whiteSpace: "pre" as const }}>
                    {f.type}
                  </div>
                  <div style={{ width: 260, padding: "12px 20px", fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, borderLeft: `1px solid ${COLORS.border}` }}>
                    {f.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly summary chart */}
          <div
            style={{
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              Monthly Summary
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 180 }}>
              {monthlyBars.map((bar, i) => {
                const delay = 25 + i * 6;
                const barProg = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.6 } });
                const barHeight = (bar.value / maxVal) * 150;
                return (
                  <div
                    key={bar.month}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 16,
                        color: COLORS.muted,
                        whiteSpace: "pre" as const,
                      }}
                    >
                      {bar.value}
                    </div>
                    <div
                      style={{
                        width: 40,
                        height: barHeight * interpolate(barProg, [0, 1], [0, 1]),
                        background: COLORS.accent,
                        borderRadius: 6,
                        opacity: interpolate(barProg, [0, 1], [0.3, 1]),
                      }}
                    />
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 16,
                        color: COLORS.subtle,
                      }}
                    >
                      {bar.month}
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
