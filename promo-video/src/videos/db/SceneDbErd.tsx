import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT, MONO } from "../../constants";

const tables = [
  { name: "Account", emoji: "👤", color: "#a78bfa", x: 480, y: 100, fields: "id, type, name, email, searchable" },
  { name: "Friendship", emoji: "💚", color: "#34d399", x: 160, y: 340, fields: "accountAId → accountBId" },
  { name: "Group", emoji: "👥", color: "#60a5fa", x: 800, y: 340, fields: "ownerId → Account" },
  { name: "GroupMember", emoji: "🛡️", color: "#818cf8", x: 1080, y: 340, fields: "groupId + accountId" },
  { name: "Conversation", emoji: "💬", color: "#f59e0b", x: 380, y: 560, fields: "type: dm | group" },
  { name: "Message", emoji: "✉️", color: "#f87171", x: 740, y: 560, fields: "text, image, voice" },
];

// Relationships as lines between table centers
const relationships = [
  { from: 0, to: 1, label: "1:N" },
  { from: 0, to: 2, label: "1:N" },
  { from: 0, to: 3, label: "1:N" },
  { from: 2, to: 3, label: "1:N" },
  { from: 4, to: 5, label: "1:N" },
  { from: 0, to: 5, label: "sender" },
];

export const SceneDbErd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#1a1a3e", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          paddingBottom: 120,
        }}
      >
        {/* Title */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 20%, #00D2FF 60%, #6C63FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <span style={{ fontSize: 44, WebkitTextFillColor: "initial" }}>🔗</span>
            实体关系总览
          </div>
        </div>

        {/* ERD diagram area */}
        <div
          style={{
            position: "relative",
            width: 1400,
            height: 700,
            marginTop: 40,
          }}
        >
          {/* Relationship lines */}
          <svg
            width={1400}
            height={700}
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          >
            {relationships.map((rel, i) => {
              const fromT = tables[rel.from];
              const toT = tables[rel.to];
              const lineProg = spring({
                frame: frame - (20 + i * 8),
                fps,
                config: { damping: 16, mass: 0.8 },
              });
              const pathOpacity = interpolate(lineProg, [0, 1], [0, 0.3]);
              const cx = (fromT.x + 100 + toT.x + 100) / 2;
              const cy = (fromT.y + 35 + toT.y + 35) / 2;

              return (
                <g key={i}>
                  <line
                    x1={fromT.x + 100}
                    y1={fromT.y + 35}
                    x2={toT.x + 100}
                    y2={toT.y + 35}
                    stroke={fromT.color}
                    strokeWidth={1.5}
                    strokeDasharray="6,4"
                    opacity={pathOpacity}
                  />
                  <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.35)"
                    fontSize={12}
                    fontFamily="JetBrains Mono, monospace"
                    opacity={pathOpacity * 2}
                  >
                    {rel.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Table nodes */}
          {tables.map((t, i) => {
            const delay = 8 + i * 10;
            const nodeProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const glow = interpolate(Math.sin(frame * 0.04 + i * 1.2), [-1, 1], [0.06, 0.15]);

            return (
              <div
                key={t.name}
                style={{
                  position: "absolute",
                  left: t.x,
                  top: t.y,
                  width: 200,
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${t.color}30`,
                  boxShadow: `0 6px 30px ${t.color}${Math.round(glow * 255).toString(16).padStart(2, "0")}`,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.8, 1])})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{t.emoji}</span>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 18,
                      fontWeight: 700,
                      color: t.color,
                    }}
                  >
                    {t.name}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {t.fields}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
