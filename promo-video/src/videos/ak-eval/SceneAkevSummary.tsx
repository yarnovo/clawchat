import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, MONO } from "../../constants";

const terminalLines = [
  { text: "\uD83D\uDCCA legal-assistant \u2014 10 cases", indent: 0, type: "header" as const },
  { text: "", indent: 0, type: "blank" as const },
  { text: "\u2705 [toolCorrectness] \u5408\u540C\u5BA1\u67E5...", indent: 2, type: "pass" as const },
  { text: "\u2705 [trajectoryMatch] \u591A\u8F6E\u5BF9\u8BDD...", indent: 2, type: "pass" as const },
  { text: "\u274C [contentCheck] \u590D\u6742\u573A\u666F...", indent: 2, type: "fail" as const },
  { text: "", indent: 0, type: "blank" as const },
  { text: "\u2705 8  \u274C 2  \uD83D\uDCCA 80%", indent: 2, type: "summary" as const },
];

export const SceneAkevSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const termProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 140,
        }}
      >
        {/* Terminal window */}
        <div
          style={{
            background: "#1E1E1E",
            borderRadius: 16,
            padding: "36px 56px 44px",
            minWidth: 720,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            opacity: interpolate(termProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(termProg, [0, 1], [0.92, 1])})`,
          }}
        >
          {/* Terminal title bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 28,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F56" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27CA40" }} />
            <div
              style={{
                fontFamily: MONO,
                fontSize: 14,
                color: "#888",
                marginLeft: 12,
              }}
            >
              agentkit eval
            </div>
          </div>

          {/* Terminal lines */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {terminalLines.map((line, i) => {
              // Lines appear one by one
              const lineDelay = 14 + i * 10;
              const lineProg = spring({
                frame: frame - lineDelay,
                fps,
                config: { damping: 14, mass: 0.5 },
              });

              if (line.type === "blank") {
                return <div key={i} style={{ height: 12 }} />;
              }

              let textColor = "#E0E0E0";
              if (line.type === "pass") textColor = COLORS.accent;
              if (line.type === "fail") textColor = COLORS.muted;
              if (line.type === "header") textColor = "#FFFFFF";
              if (line.type === "summary") textColor = "#E0E0E0";

              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: line.type === "header" ? 28 : 24,
                    fontWeight: line.type === "header" || line.type === "summary" ? 700 : 400,
                    color: textColor,
                    paddingLeft: line.indent * 24,
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lineProg, [0, 1], [-16, 0])}px)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
