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

const friendshipFields = [
  { name: "id", type: "UUID", icon: "🔑" },
  { name: "accountAId", type: "String", icon: "👤" },
  { name: "accountBId", type: "String", icon: "👤" },
  { name: "status", type: "FriendshipStatus", icon: "📋" },
];

const groupFields = [
  { name: "id", type: "UUID", icon: "🔑" },
  { name: "name", type: "String", icon: "💬" },
  { name: "ownerId", type: "String", icon: "👑" },
];

const memberFields = [
  { name: "groupId", type: "String", icon: "🏠" },
  { name: "accountId", type: "String", icon: "👤" },
  { name: "role", type: "GroupRole", icon: "🛡️" },
];

interface TableCardProps {
  title: string;
  emoji: string;
  fields: { name: string; type: string; icon: string }[];
  color: string;
  delay: number;
  badge?: string;
}

const TableCard: React.FC<TableCardProps> = ({ title, emoji, fields, color, delay, badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
  const glow = interpolate(Math.sin(frame * 0.04 + delay * 0.1), [-1, 1], [0.06, 0.14]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 380,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 20,
        border: `1px solid ${color}22`,
        overflow: "hidden",
        opacity: interpolate(prog, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(prog, [0, 1], [50, 0])}px) scale(${interpolate(prog, [0, 1], [0.9, 1])})`,
        boxShadow: `0 8px 40px ${color}${Math.round(glow * 255).toString(16).padStart(2, "0")}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: `${color}08`,
        }}
      >
        <span style={{ fontSize: 24 }}>{emoji}</span>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 20,
            fontWeight: 700,
            color,
          }}
        >
          {title}
        </div>
        {badge && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color,
              padding: "3px 10px",
              borderRadius: 6,
              background: `${color}15`,
              border: `1px solid ${color}30`,
              marginLeft: "auto",
            }}
          >
            {badge}
          </div>
        )}
      </div>

      {/* Fields */}
      {fields.map((f, i) => {
        const rowDelay = delay + 8 + i * 5;
        const rowProg = spring({ frame: frame - rowDelay, fps, config: { damping: 14, mass: 0.5 } });

        return (
          <div
            key={f.name}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 20px",
              gap: 10,
              opacity: interpolate(rowProg, [0, 1], [0, 1]),
              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
            }}
          >
            <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{f.icon}</span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 15,
                fontWeight: 600,
                color: "rgba(255,255,255,0.85)",
                width: 140,
              }}
            >
              {f.name}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: `${color}cc`,
              }}
            >
              {f.type}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const SceneDbSocial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0c0a2e", "#0e2a1e", "#0c0a2e"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 120,
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <span style={{ fontSize: 44 }}>🤝</span>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fff 30%, #34d399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            社交关系层
          </div>
        </div>

        {/* Status enum badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {[
            { label: "pending", color: "#f59e0b" },
            { label: "accepted", color: "#34d399" },
            { label: "rejected", color: "#f87171" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: s.color,
                padding: "5px 14px",
                borderRadius: 8,
                background: `${s.color}10`,
                border: `1px solid ${s.color}30`,
              }}
            >
              {s.label}
            </div>
          ))}
          <div style={{ width: 20 }} />
          {[
            { label: "owner", color: "#f59e0b" },
            { label: "admin", color: "#60a5fa" },
            { label: "member", color: "#a78bfa" },
          ].map((r) => (
            <div
              key={r.label}
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: r.color,
                padding: "5px 14px",
                borderRadius: 8,
                background: `${r.color}10`,
                border: `1px solid ${r.color}30`,
              }}
            >
              {r.label}
            </div>
          ))}
        </div>

        {/* Three cards */}
        <div style={{ display: "flex", gap: 24 }}>
          <TableCard
            title="Friendship"
            emoji="💚"
            fields={friendshipFields}
            color="#34d399"
            delay={10}
            badge="@@unique([A, B])"
          />
          <TableCard
            title="Group"
            emoji="👥"
            fields={groupFields}
            color="#60a5fa"
            delay={20}
          />
          <TableCard
            title="GroupMember"
            emoji="🛡️"
            fields={memberFields}
            color="#a78bfa"
            delay={30}
            badge="@@unique([group, account])"
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
