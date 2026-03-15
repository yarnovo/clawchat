import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

const CYCLE_STEPS = [
  { label: "Agent 写入", icon: "✍️" },
  { label: "MEMORY.md\n更新", icon: "📄" },
  { label: "热加载", icon: "🔥" },
  { label: "下轮对话\n可用", icon: "💬" },
];

const RADIUS = 160;
const CENTER_X = 960;
const CENTER_Y = 420;

export const SceneAkemSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cycleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          paddingBottom: 140,
        }}
      >
        {/* Cycle nodes + arrows */}
        {CYCLE_STEPS.map((step, i) => {
          const angle = (i / CYCLE_STEPS.length) * Math.PI * 2 - Math.PI / 2;
          const x = CENTER_X + RADIUS * 1.6 * Math.cos(angle);
          const y = CENTER_Y + RADIUS * Math.sin(angle);

          const nodeDelay = 8 + i * 12;
          const nodeProg = spring({
            frame: frame - nodeDelay,
            fps,
            config: { damping: 12, mass: 0.7 },
          });

          // Arrow to next node
          const nextAngle = ((i + 1) / CYCLE_STEPS.length) * Math.PI * 2 - Math.PI / 2;
          const midAngle = (angle + nextAngle) / 2;
          const arrowX = CENTER_X + RADIUS * 1.2 * Math.cos(midAngle);
          const arrowY = CENTER_Y + RADIUS * 0.75 * Math.sin(midAngle);
          const arrowRotation = (midAngle * 180) / Math.PI + 90;

          const arrowDelay = 14 + i * 12;
          const arrowProg = spring({
            frame: frame - arrowDelay,
            fps,
            config: { damping: 14 },
          });

          return (
            <div key={i}>
              {/* Node */}
              <div
                style={{
                  position: "absolute",
                  left: x - 90,
                  top: y - 55,
                  width: 180,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 12px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.6, 1])})`,
                }}
              >
                <div style={{ fontSize: 36 }}>{step.icon}</div>
                <div
                  style={{
                    fontFamily: step.label.includes("MEMORY") ? MONO : FONT_SANS,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.text,
                    textAlign: "center",
                    whiteSpace: "pre-line",
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </div>
              </div>

              {/* Arrow between nodes */}
              <div
                style={{
                  position: "absolute",
                  left: arrowX - 12,
                  top: arrowY - 12,
                  width: 24,
                  height: 24,
                  opacity: interpolate(arrowProg, [0, 1], [0, 1]),
                  transform: `rotate(${arrowRotation}deg) scale(${interpolate(arrowProg, [0, 1], [0.3, 1])})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderTop: `14px solid ${COLORS.accent}`,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Center cycle label */}
        <div
          style={{
            position: "absolute",
            left: CENTER_X - 60,
            top: CENTER_Y - 20,
            width: 120,
            textAlign: "center",
            fontFamily: FONT_SANS,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: interpolate(cycleProg, [0, 1], [0, 1]),
          }}
        >
          记忆循环
        </div>

        {/* Badge: 无需重启 */}
        {(() => {
          const badgeProg = spring({
            frame: frame - 60,
            fps,
            config: { damping: 10, mass: 0.6 },
          });
          return (
            <div
              style={{
                position: "absolute",
                left: CENTER_X - 80,
                top: CENTER_Y + RADIUS + 100,
                width: 160,
                textAlign: "center",
                padding: "10px 24px",
                borderRadius: 24,
                background: COLORS.accent,
                color: COLORS.white,
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 700,
                boxShadow: "0 4px 20px rgba(218,119,86,0.3)",
                opacity: interpolate(badgeProg, [0, 1], [0, 1]),
                transform: `scale(${interpolate(badgeProg, [0, 1], [0.5, 1])})`,
              }}
            >
              无需重启
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
