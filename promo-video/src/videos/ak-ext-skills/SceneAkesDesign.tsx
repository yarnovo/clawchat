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

const treeLines = [
  { text: "skills/web/", indent: 0, accent: true },
  { text: "\u251C\u2500\u2500 SKILL.md", indent: 1, accent: false },
  { text: "\u251C\u2500\u2500 scripts/", indent: 1, accent: false },
  { text: "\u2502   \u251C\u2500\u2500 search.sh", indent: 2, accent: false },
  { text: "\u2502   \u2514\u2500\u2500 fetch.sh", indent: 2, accent: false },
  { text: "\u2514\u2500\u2500 hooks/", indent: 1, accent: false },
  { text: "    \u2514\u2500\u2500 pre-tool.sh", indent: 2, accent: false },
];

export const SceneAkesDesign: React.FC = () => {
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
          Skill \u76EE\u5F55\u7ED3\u6784
        </div>

        {/* File tree card */}
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "40px 64px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          {treeLines.map((line, i) => {
            const delay = 12 + i * 10;
            const lineProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 30,
                  lineHeight: "52px",
                  color: line.accent ? COLORS.accent : COLORS.text,
                  fontWeight: line.accent ? 700 : 400,
                  opacity: interpolate(lineProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(lineProg, [0, 1], [-20, 0])}px)`,
                  whiteSpace: "pre",
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>

        {/* Annotation */}
        <div style={{ display: "flex", gap: 40 }}>
          {[
            { label: "SKILL.md", desc: "\u63D0\u793A\u8BCD" },
            { label: "scripts/", desc: "Bash \u811A\u672C" },
            { label: "hooks/", desc: "\u751F\u547D\u5468\u671F\u94A9\u5B50" },
          ].map((item, i) => {
            const delay = 50 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
