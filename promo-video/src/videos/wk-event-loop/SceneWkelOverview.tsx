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

const EXPORTS = [
  { name: "AgentEvent", kind: "interface" },
  { name: "createEvent()", kind: "function" },
  { name: "EventLoop", kind: "class" },
];

export const SceneWkelOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const fileProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 32, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 90,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -3,
            transform: `scale(${titleScale})`,
          }}
        >
          EventLoop
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          index.ts -- 162 lines, zero deps
        </div>

        {/* File badge */}
        <div
          style={{
            marginTop: 12,
            padding: "10px 28px",
            borderRadius: 24,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.accent,
              whiteSpace: "pre",
            }}
          >
            @agentkit/event-loop/src/index.ts
          </span>
        </div>

        {/* Export cards */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 24,
          }}
        >
          {EXPORTS.map((exp, i) => {
            const prog = spring({
              frame: frame - 40 - i * 10,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "20px 32px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                    whiteSpace: "pre",
                  }}
                >
                  {exp.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    color: COLORS.muted,
                  }}
                >
                  {exp.kind}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
