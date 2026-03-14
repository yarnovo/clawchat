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

const flow = [
  { label: "agent-server", desc: "创建 Agent" },
  { label: "openclaw-server", desc: "buildEnv() 注入\nCLAWHUB_REGISTRY" },
  { label: "container-server", desc: "启动 Docker 容器" },
  { label: "Agent 容器", desc: "clawhub install\n走本地 registry" },
];

export const SceneRegistryAgent: React.FC = () => {
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
          gap: 48,
          paddingBottom: 140,
        }}
      >
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
          自动注入，对用户透明
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {flow.map((step, i) => {
            const delay = 15 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isLast = i === flow.length - 1;

            return (
              <div
                key={step.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    padding: "28px 24px",
                    borderRadius: 14,
                    background: isLast ? COLORS.accent : COLORS.card,
                    border: `1px solid ${isLast ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    width: 220,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 20,
                      fontWeight: 700,
                      color: isLast ? COLORS.white : COLORS.text,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      color: isLast ? "rgba(255,255,255,0.85)" : COLORS.muted,
                      textAlign: "center",
                      whiteSpace: "pre-line",
                      lineHeight: 1.4,
                    }}
                  >
                    {step.desc}
                  </div>
                </div>
                {!isLast && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
