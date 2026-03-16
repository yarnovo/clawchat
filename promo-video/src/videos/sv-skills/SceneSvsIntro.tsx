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

const flowSteps = [
  { icon: "\uD83D\uDCE5", label: "Install", desc: "\u590D\u5236\u6280\u80FD\u76EE\u5F55\u5230\u5DE5\u4F5C\u533A", color: COLORS.accent },
  { icon: "\uD83D\uDDD1\uFE0F", label: "Uninstall", desc: "\u5220\u9664\u5DE5\u4F5C\u533A\u4E2D\u7684\u6280\u80FD\u76EE\u5F55", color: COLORS.muted },
];

const skillStructure = [
  "weather-skill/",
  "  SKILL.md",
  "  index.ts",
  "  config.json",
];

export const SceneSvsIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Skills Management
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {"\u6280\u80FD\u7684\u5B89\u88C5\u4E0E\u5378\u8F7D"}
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "flex-start" }}>
          {/* Install / Uninstall flow cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {flowSteps.map((step, i) => {
              const delay = 22 + i * 12;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 12, mass: 0.6 },
              });
              return (
                <div
                  key={step.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 16,
                    padding: "28px 36px",
                    minWidth: 400,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-40, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 48 }}>{step.icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 30,
                        fontWeight: 700,
                        color: step.color,
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        color: COLORS.muted,
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Skill directory structure */}
          {(() => {
            const dirProg = spring({ frame: frame - 35, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "28px 36px",
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(dirProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(dirProg, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    marginBottom: 16,
                  }}
                >
                  Skill Directory
                </div>
                {skillStructure.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      color: i === 0 ? COLORS.text : COLORS.muted,
                      fontWeight: i === 0 ? 700 : 400,
                      lineHeight: 1.8,
                      whiteSpace: "pre" as const,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
