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

const installSteps = [
  { label: "Read from Registry", icon: "\uD83D\uDCDA", code: "skills/weather-skill/" },
  { label: "Copy to Workspace", icon: "\uD83D\uDCCB", code: "cp -r skill/ agent/skills/" },
  { label: "Auto-load on Next Msg", icon: "\u26A1", code: "loadSkills(workspace)" },
];

const workspaceTree = [
  { text: "agent-workspace/", indent: 0, bold: true },
  { text: "  skills/", indent: 0, bold: true },
  { text: "    weather-skill/", indent: 0, bold: false },
  { text: "      SKILL.md", indent: 0, bold: false },
  { text: "      index.ts", indent: 0, bold: false },
  { text: "    translate-skill/", indent: 0, bold: false },
  { text: "      SKILL.md", indent: 0, bold: false },
  { text: "      index.ts", indent: 0, bold: false },
  { text: "  config.json", indent: 0, bold: false },
  { text: "  SYSTEM.md", indent: 0, bold: false },
];

export const SceneSvsInstall: React.FC = () => {
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
          Install Flow
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Install steps (left) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {installSteps.map((step, i) => {
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
                      alignItems: "center",
                      gap: 20,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 14,
                      padding: "20px 28px",
                      minWidth: 480,
                      boxShadow: COLORS.cardShadow,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog, [0, 1], [-30, 0])}px)`,
                    }}
                  >
                    <div style={{ fontSize: 36 }}>{step.icon}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 24,
                          fontWeight: 700,
                          color: COLORS.text,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 18,
                          color: COLORS.muted,
                          background: COLORS.bg,
                          padding: "4px 10px",
                          borderRadius: 6,
                          border: `1px solid ${COLORS.border}`,
                          whiteSpace: "pre" as const,
                        }}
                      >
                        {step.code}
                      </div>
                    </div>
                  </div>
                  {/* Down arrow */}
                  {i < installSteps.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 260,
                        marginTop: 80,
                        fontFamily: FONT_SANS,
                        fontSize: 28,
                        color: COLORS.accent,
                        opacity: interpolate(prog, [0, 1], [0, 1]),
                      }}
                    >
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Workspace tree (right) */}
          {(() => {
            const treeProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "24px 32px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(treeProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(treeProg, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    marginBottom: 12,
                  }}
                >
                  Agent Workspace
                </div>
                {workspaceTree.map((line, i) => {
                  const lineDelay = 35 + i * 3;
                  const lineProg = spring({ frame: frame - lineDelay, fps, config: { damping: 14 } });
                  return (
                    <div
                      key={i}
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        color: line.bold ? COLORS.text : COLORS.muted,
                        fontWeight: line.bold ? 700 : 400,
                        lineHeight: 1.7,
                        whiteSpace: "pre" as const,
                        opacity: interpolate(lineProg, [0, 1], [0, 1]),
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
