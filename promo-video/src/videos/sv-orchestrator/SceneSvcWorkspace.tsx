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

const phases = [
  {
    label: "Create",
    desc: "AGENT.md + skills/",
    color: COLORS.text,
  },
  {
    label: "Fork",
    desc: "cp -r 整个工作区",
    color: COLORS.accent,
  },
  {
    label: "Delete",
    desc: "mv → /data/trash/",
    color: COLORS.muted,
  },
  {
    label: "Cleanup",
    desc: "30 天后 rm -rf",
    color: COLORS.subtle,
  },
];

const fileTree = [
  { indent: 0, name: "/data/workspaces/{agentId}/", isDir: true },
  { indent: 1, name: "AGENT.md", isDir: false },
  { indent: 1, name: "MEMORY.md", isDir: false },
  { indent: 1, name: "skills/", isDir: true },
];

export const SceneSvcWorkspace: React.FC = () => {
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
          Workspace 生命周期
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "flex-start" }}>
          {/* Left: lifecycle flow */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {phases.map((p, i) => {
              const prog = spring({
                frame: frame - 10 - i * 10,
                fps,
                config: { damping: 14, mass: 0.7 },
              });
              return (
                <div key={p.label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                      padding: "14px 24px",
                      borderRadius: 12,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      minWidth: 340,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 28,
                        fontWeight: 700,
                        color: p.color,
                        width: 110,
                        whiteSpace: "pre",
                      }}
                    >
                      {p.label}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: COLORS.muted,
                      }}
                    >
                      {p.desc}
                    </span>
                  </div>
                  {/* Arrow between phases */}
                  {i < phases.length - 1 && (
                    <div
                      style={{
                        textAlign: "center",
                        fontFamily: MONO,
                        fontSize: 24,
                        color: COLORS.subtle,
                        padding: "4px 0",
                        opacity: interpolate(prog, [0, 1], [0, 1]),
                      }}
                    >
                      ↓
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              width: 1,
              background: COLORS.border,
              alignSelf: "stretch",
            }}
          />

          {/* Right: file tree */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {(() => {
              const headerProg = spring({
                frame: frame - 8,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.muted,
                    marginBottom: 8,
                    opacity: interpolate(headerProg, [0, 1], [0, 1]),
                  }}
                >
                  工作区结构
                </div>
              );
            })()}

            {fileTree.map((f, i) => {
              const prog = spring({
                frame: frame - 16 - i * 6,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={f.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingLeft: f.indent * 28,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: f.isDir ? COLORS.accent : COLORS.text,
                      fontWeight: f.isDir ? 700 : 400,
                      whiteSpace: "pre",
                    }}
                  >
                    {f.isDir ? "📁 " : "📄 "}
                    {f.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
