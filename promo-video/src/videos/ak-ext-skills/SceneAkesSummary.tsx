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

const skills = [
  { label: "\u7F51\u7EDC", icon: "\u{1F310}" },
  { label: "\u4EFB\u52A1", icon: "\u2705" },
];

export const SceneAkesSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

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
        {/* Section title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {"\u5185\u7F6E\u6280\u80FD"}
        </div>

        {/* 4 skill cards in a row */}
        <div style={{ display: "flex", gap: 32 }}>
          {skills.map((skill, i) => {
            const delay = 14 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={skill.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 20,
                  padding: "36px 48px",
                  minWidth: 200,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 48 }}>{skill.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {skill.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom skill hint */}
        {(() => {
          const hintProg = spring({
            frame: frame - 60,
            fps,
            config: { damping: 14, mass: 0.7 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                letterSpacing: 1,
                opacity: interpolate(hintProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(hintProg, [0, 1], [16, 0])}px)`,
              }}
            >
              {"\u81EA\u5B9A\u4E49\u6280\u80FD\uFF1A\u653E\u5230 "}
              <span
                style={{
                  fontFamily: MONO,
                  color: COLORS.accent,
                  fontWeight: 600,
                }}
              >
                skills/
              </span>
              {" \u5373\u53EF"}
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
