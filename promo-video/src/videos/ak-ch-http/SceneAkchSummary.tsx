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

const flowSteps = [
  { label: "HTTP 请求", icon: "📨", mono: false },
  { label: "Channel", icon: "🔌", mono: false },
  { label: "Event", icon: "⚡", mono: false },
  { label: "EventLoop", icon: "🔄", mono: true },
  { label: "Agent", icon: "🤖", mono: false },
  { label: "SSE 推送", icon: "📡", mono: false },
];

export const SceneAkchSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Flow diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {flowSteps.map((step, i) => {
            const delay = 5 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            const arrowDelay = delay + 8;
            const arrowProg = spring({
              frame: frame - arrowDelay,
              fps,
              config: { damping: 16 },
            });

            const isLast = i === flowSteps.length - 1;
            const isAgent = step.label === "Agent";

            return (
              <div
                key={step.label}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {/* Step box */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 10,
                    padding: "20px 18px",
                    borderRadius: 14,
                    background: isAgent ? COLORS.accent : COLORS.card,
                    border: isAgent ? "none" : `1px solid ${COLORS.border}`,
                    boxShadow: isAgent
                      ? "0 4px 24px rgba(218,119,86,0.25)"
                      : COLORS.cardShadow,
                    minWidth: 120,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px) scale(${interpolate(prog, [0, 1], [0.85, 1])})`,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{step.icon}</div>
                  <div
                    style={{
                      fontFamily: step.mono ? MONO : FONT_SANS,
                      fontSize: 18,
                      fontWeight: 700,
                      color: isAgent ? COLORS.white : COLORS.text,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {step.label}
                  </div>
                </div>

                {/* Arrow between steps */}
                {!isLast && (
                  <svg
                    width="36"
                    height="24"
                    viewBox="0 0 36 24"
                    style={{
                      opacity: interpolate(arrowProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(arrowProg, [0, 1], [-10, 0])}px)`,
                    }}
                  >
                    <defs>
                      <marker
                        id={`flowArrow-${i}`}
                        markerWidth="8"
                        markerHeight="6"
                        refX="7"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L8,3 L0,6" fill={COLORS.accent} />
                      </marker>
                    </defs>
                    <line
                      x1="2"
                      y1="12"
                      x2="28"
                      y2="12"
                      stroke={COLORS.accent}
                      strokeWidth="2.5"
                      markerEnd={`url(#flowArrow-${i})`}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
