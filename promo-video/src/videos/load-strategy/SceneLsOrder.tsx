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

const openclawOrder = [
  "AGENTS", "SOUL", "TOOLS", "IDENTITY", "USER", "HEARTBEAT", "BOOTSTRAP", "MEMORY",
];
const ironclawOrder = [
  "BOOTSTRAP", "AGENTS", "SOUL", "IDENTITY", "USER", "HEARTBEAT", "MEMORY",
];

export const SceneLsOrder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const colProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          加载顺序
        </div>

        <div
          style={{
            display: "flex",
            gap: 60,
            opacity: interpolate(colProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(colProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* OpenClaw column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              OpenClaw
            </div>
            {openclawOrder.map((name, i) => {
              const delay = 18 + i * 4;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.accent,
                      width: 32,
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.text,
                      padding: "6px 16px",
                      borderRadius: 8,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      minWidth: 160,
                      textAlign: "center",
                    }}
                  >
                    {name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* IronClaw column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 8,
              }}
            >
              IronClaw
            </div>
            {ironclawOrder.map((name, i) => {
              const delay = 18 + i * 4;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.5 } });
              const isDiff = name === "BOOTSTRAP" && i === 0;
              return (
                <div
                  key={`${name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: COLORS.accent,
                      width: 32,
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 24,
                      fontWeight: 600,
                      color: isDiff ? COLORS.accent : COLORS.text,
                      padding: "6px 16px",
                      borderRadius: 8,
                      background: isDiff ? "rgba(218, 119, 86, 0.08)" : COLORS.card,
                      border: isDiff ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                      minWidth: 160,
                      textAlign: "center",
                    }}
                  >
                    {name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.accent,
            marginTop: 8,
            padding: "8px 24px",
            borderRadius: 8,
            background: "rgba(218, 119, 86, 0.08)",
            border: `1px solid rgba(218, 119, 86, 0.2)`,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [16, 0])}px)`,
          }}
        >
          越靠前越重要
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
