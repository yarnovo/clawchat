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
  { name: "Agent", x: 340, y: 120, fields: "id, accountId, ownerId\nparentId, name", color: COLORS.text },
  { name: "AgentConfig", x: 900, y: 120, fields: "model, apiKey, status\ncontainerId, runtime", color: COLORS.accent },
  { name: "Agent (child)", x: 340, y: 420, fields: "parentId → Agent.id", color: COLORS.muted },
  { name: "im-server\nAccount", x: 900, y: 420, fields: "accountId 共享", color: COLORS.muted },
];

const relationships = [
  { from: 0, to: 1, label: "1:1", labelX: 0, labelY: -14 },
  { from: 0, to: 2, label: "self ref", labelX: -50, labelY: 0 },
  { from: 0, to: 3, label: "accountId", labelX: 0, labelY: 0 },
];

export const SceneAgentDbErd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const nodeW = 280;
  const nodeH = 100;

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
            }}
          >
            关系与跨服务协作
          </div>
        </div>

        {/* ERD diagram */}
        <div
          style={{
            position: "relative",
            width: 1400,
            height: 600,
            marginTop: 60,
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
              const pathOpacity = interpolate(lineProg, [0, 1], [0, 0.35]);

              const x1 = fromN.x + nodeW / 2;
              const y1 = fromN.y + nodeH / 2;
              const x2 = toN.x + nodeW / 2;
              const y2 = toN.y + nodeH / 2;
              const cx = (x1 + x2) / 2 + rel.labelX;
              const cy = (y1 + y2) / 2 + rel.labelY;

              // Cross-service dashed line style
              const isDashed = rel.label === "accountId";

              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isDashed ? COLORS.accent : COLORS.muted}
                    strokeWidth={isDashed ? 2 : 1.5}
                    strokeDasharray={isDashed ? "8,6" : "6,4"}
                    opacity={pathOpacity}
                  />
                  <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    fill={isDashed ? COLORS.accent : COLORS.muted}
                    fontSize={18}
                    fontFamily="'JetBrains Mono', 'SF Mono', monospace"
                    fontWeight={isDashed ? 700 : 400}
                    opacity={pathOpacity * 2.5}
                  >
                    {rel.label}
                  </text>
                </g>
              );
            })}

            {/* Cross-service boundary */}
            {(() => {
              const boundProg = spring({
                frame: frame - 40,
                fps,
                config: { damping: 16 },
              });
              const boundOpacity = interpolate(boundProg, [0, 1], [0, 0.2]);
              return (
                <>
                  <line
                    x1={100}
                    y1={360}
                    x2={1300}
                    y2={360}
                    stroke={COLORS.border}
                    strokeWidth={1}
                    strokeDasharray="12,8"
                    opacity={boundOpacity}
                  />
                  <text
                    x={1300}
                    y={375}
                    textAnchor="end"
                    fill={COLORS.subtle}
                    fontSize={20}
                    fontFamily="'Noto Sans SC', sans-serif"
                    opacity={boundOpacity * 3}
                  >
                    跨服务边界
                  </text>
                </>
              );
            })()}
          </svg>

          {/* Nodes */}
          {nodes.map((n, i) => {
            const delay = 8 + i * 10;
            const nodeProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isCrossService = n.name.includes("im-server");

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
                  background: isCrossService
                    ? "rgba(218,119,86,0.04)"
                    : COLORS.card,
                  border: `1px solid ${isCrossService ? COLORS.accent : COLORS.border}`,
                  borderStyle: isCrossService ? "dashed" : "solid",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.8, 1])})`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 28,
                    fontWeight: 700,
                    color: n.color,
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    lineHeight: 1.3,
                  }}
                >
                  {n.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
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
