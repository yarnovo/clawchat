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

const statusLines = [
  { text: "legal-assistant started", prefix: "\uD83D\uDE80 " },
  { text: "   Extensions: skills, memory", prefix: "" },
  { text: "   Channels: scheduler, http", prefix: "" },
  { text: "   Tools: bash", prefix: "" },
];

export const SceneAkclSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cmdProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 140,
        }}
      >
        {/* Terminal command */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(cmdProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cmdProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <span style={{ color: COLORS.muted }}>$ </span>
          <span style={{ color: COLORS.accent }}>agentkit serve</span>
          <span style={{ color: COLORS.text }}> ./agents/legal</span>
        </div>

        {/* Status output block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "36px 56px",
            boxShadow: COLORS.cardShadow,
            minWidth: 600,
          }}
        >
          {statusLines.map((line, i) => {
            const delay = 20 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isFirst = i === 0;
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: isFirst ? 30 : 26,
                  fontWeight: isFirst ? 700 : 500,
                  color: isFirst ? COLORS.accent : COLORS.muted,
                  lineHeight: 1.8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [14, 0])}px)`,
                }}
              >
                {line.prefix}{line.text}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(
              spring({
                frame: frame - 20 - statusLines.length * 14,
                fps,
                config: { damping: 14 },
              }),
              [0, 1],
              [0, 1],
            ),
            transform: `translateY(${interpolate(
              spring({
                frame: frame - 20 - statusLines.length * 14,
                fps,
                config: { damping: 14 },
              }),
              [0, 1],
              [15, 0],
            )}px)`,
          }}
        >
          一行命令，完整上线
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
