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

const nodes = [
  { name: "agents", x: 560, y: 60, fields: "id, ownerId, name\nstatus, config", color: COLORS.text },
  { name: "market_listings", x: 160, y: 300, fields: "agentId → agents.id\ntitle, price, status", color: COLORS.accent },
  { name: "usage_records", x: 560, y: 440, fields: "userId, agentId\ntype, amount", color: COLORS.muted },
  { name: "skill_installations", x: 960, y: 300, fields: "agentId → agents.id\nskillName, version", color: COLORS.accent },
];

const relationships = [
  { from: 0, to: 1, label: "1:N" },
  { from: 0, to: 2, label: "1:N" },
  { from: 0, to: 3, label: "1:N" },
];

export const SceneSvdbMarket: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const nodeW = 300;
  const nodeH = 110;

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
            top: 50,
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
              fontSize: 56,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            表关系图
          </div>
        </div>

        {/* ER diagram */}
        <div
          style={{
            position: "relative",
            width: 1400,
            height: 600,
            marginTop: 40,
          }}
        >
          {/* Relationship lines */}
          <svg
            width={1400}
            height={600}
            style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          >
            {relationships.map((rel, i) => {
              const fromN = nodes[rel.from];
              const toN = nodes[rel.to];
              const lineProg = spring({
                frame: frame - (20 + i * 10),
                fps,
                config: { damping: 16, mass: 0.8 },
              });
              const pathOpacity = interpolate(lineProg, [0, 1], [0, 0.4]);

              const x1 = fromN.x + nodeW / 2;
              const y1 = fromN.y + nodeH / 2;
              const x2 = toN.x + nodeW / 2;
              const y2 = toN.y + nodeH / 2;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2;

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={COLORS.accent}
                    strokeWidth={2}
                    strokeDasharray="8,6"
                    opacity={pathOpacity}
                  />
                  <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    fill={COLORS.accent}
                    fontSize={20}
                    fontFamily="'JetBrains Mono', 'SF Mono', monospace"
                    fontWeight={600}
                    opacity={pathOpacity * 2.5}
                  >
                    {rel.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((n, i) => {
            const delay = 8 + i * 10;
            const nodeProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isPrimary = n.name === "agents";

            return (
              <div
                key={n.name}
                style={{
                  position: "absolute",
                  left: n.x,
                  top: n.y,
                  width: nodeW,
                  padding: "14px 18px",
                  borderRadius: 12,
                  background: isPrimary ? "rgba(218,119,86,0.04)" : COLORS.card,
                  border: `1px solid ${isPrimary ? COLORS.accent : COLORS.border}`,
                  borderWidth: isPrimary ? 2 : 1,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.8, 1])})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: n.color,
                    textAlign: "center",
                  }}
                >
                  {n.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    color: COLORS.muted,
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    lineHeight: 1.5,
                  }}
                >
                  {n.fields}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
