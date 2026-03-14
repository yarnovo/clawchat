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

const friendshipFields = [
  { name: "id", type: "UUID" },
  { name: "accountAId", type: "String" },
  { name: "accountBId", type: "String" },
  { name: "status", type: "FriendshipStatus" },
];

const groupFields = [
  { name: "id", type: "UUID" },
  { name: "name", type: "String" },
  { name: "ownerId", type: "String" },
];

const memberFields = [
  { name: "groupId", type: "String" },
  { name: "accountId", type: "String" },
  { name: "role", type: "GroupRole" },
];

interface TableCardProps {
  title: string;
  fields: { name: string; type: string }[];
  delay: number;
  badge?: string;
}

const TableCard: React.FC<TableCardProps> = ({ title, fields, delay, badge }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 360,
        background: COLORS.card,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        opacity: interpolate(prog, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
        boxShadow: COLORS.cardShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {title}
        </div>
        {badge && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 24,
              color: COLORS.accent,
              padding: "3px 10px",
              borderRadius: 6,
              background: "rgba(218,119,86,0.08)",
              border: "1px solid rgba(218,119,86,0.2)",
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
              padding: "9px 20px",
              gap: 12,
              opacity: interpolate(rowProg, [0, 1], [0, 1]),
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.text,
                width: 140,
              }}
            >
              {f.name}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 28,
                color: COLORS.accent,
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
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
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
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
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
            { label: "pending", color: COLORS.accent },
            { label: "accepted", color: COLORS.accent },
            { label: "rejected", color: COLORS.accent },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: s.color,
                padding: "5px 14px",
                borderRadius: 8,
                background: "rgba(218,119,86,0.08)",
                border: "1px solid rgba(218,119,86,0.2)",
              }}
            >
              {s.label}
            </div>
          ))}
          <div style={{ width: 20 }} />
          {[
            { label: "owner", color: COLORS.accent },
            { label: "admin", color: COLORS.text },
            { label: "member", color: COLORS.muted },
          ].map((r) => (
            <div
              key={r.label}
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: r.color,
                padding: "5px 14px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
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
            fields={friendshipFields}
            delay={10}
            badge="@@unique([A, B])"
          />
          <TableCard
            title="Group"
            fields={groupFields}
            delay={20}
          />
          <TableCard
            title="GroupMember"
            fields={memberFields}
            delay={30}
            badge="@@unique([group, account])"
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
