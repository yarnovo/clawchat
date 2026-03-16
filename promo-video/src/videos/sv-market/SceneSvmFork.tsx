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

const steps = [
  { icon: "\uD83D\uDCC2", label: "Source Agent", desc: "原始 Agent 工作区", code: "/workspaces/agent-abc/" },
  { icon: "\uD83D\uDCCB", label: "Copy Workspace", desc: "复制完整目录结构", code: "cp -r workspace/ new-workspace/" },
  { icon: "\uD83D\uDDC4\uFE0F", label: "New DB Record", desc: "创建独立数据库记录", code: "INSERT INTO agents ..." },
  { icon: "\uD83D\uDE80", label: "Start Container", desc: "自动启动新容器", code: "docker run agent-xyz" },
  { icon: "\u2705", label: "Ready", desc: "独立运行的 Agent 副本", code: "status: running" },
];

export const SceneSvmFork: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
          Fork Flow
        </div>

        {/* Flow diagram */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {steps.map((step, i) => {
            const delay = 12 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: "24px 28px",
                    minWidth: 200,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <div style={{ fontSize: 36 }}>{step.icon}</div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      color: COLORS.muted,
                      textAlign: "center",
                    }}
                  >
                    {step.desc}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      color: COLORS.subtle,
                      background: COLORS.bg,
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: `1px solid ${COLORS.border}`,
                      whiteSpace: "pre" as const,
                    }}
                  >
                    {step.code}
                  </div>
                </div>
                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.accent,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    {"\u2192"}
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
