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

const tables = [
  { name: "Account", color: COLORS.text, x: 480, y: 100, fields: "id, type, name, email, searchable" },
  { name: "Friendship", color: COLORS.accent, x: 160, y: 340, fields: "accountAId → accountBId" },
  { name: "Group", color: COLORS.text, x: 800, y: 340, fields: "ownerId → Account" },
  { name: "GroupMember", color: COLORS.muted, x: 1080, y: 340, fields: "groupId + accountId" },
  { name: "Conversation", color: COLORS.accent, x: 380, y: 560, fields: "type: dm | group" },
  { name: "Message", color: COLORS.text, x: 740, y: 560, fields: "text, image, voice" },
];

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
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          paddingBottom: 140,
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
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
            }}
          >
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
              const pathOpacity = interpolate(lineProg, [0, 1], [0, 0.25]);
              const cx = (fromT.x + 100 + toT.x + 100) / 2;
              const cy = (fromT.y + 35 + toT.y + 35) / 2;

              return (
                <g key={i}>
                  <line
                    x1={fromT.x + 100}
                    y1={fromT.y + 35}
                    x2={toT.x + 100}
                    y2={toT.y + 35}
                    stroke={COLORS.muted}
                    strokeWidth={1.5}
                    strokeDasharray="6,4"
                    opacity={pathOpacity}
                  />
                  <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    fill={COLORS.muted}
                    fontSize={12}
                    fontFamily={MONO}
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

            return (
              <div
                key={t.name}
                style={{
                  position: "absolute",
                  left: t.x,
                  top: t.y,
                  width: 200,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.8, 1])})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: 28,
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
                    fontSize: 24,
                    color: COLORS.muted,
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
