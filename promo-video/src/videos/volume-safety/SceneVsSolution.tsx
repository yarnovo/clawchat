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

const mounts = [
  { runtime: "OpenClaw", volume: "openclaw-data-{id}", mount: "/root/.openclaw" },
  { runtime: "NanoClaw", volume: "nanoclaw-data-{id}", mount: "/app/data" },
  { runtime: "IronClaw", volume: "ironclaw-data-{id}", mount: "/data" },
];

export const SceneVsSolution: React.FC = () => {
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
          gap: 40,
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
          每个 Agent 专属 Volume
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            {["运行时", "Volume 名称", "挂载路径"].map((h) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.muted,
                  padding: "16px 32px",
                  width: 320,
                  textAlign: "center",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {mounts.map((row, i) => {
            const prog = spring({
              frame: frame - 15 - i * 10,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={row.runtime}
                style={{
                  display: "flex",
                  borderBottom: i < mounts.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 600,
                    color: COLORS.text,
                    padding: "20px 32px",
                    width: 320,
                    textAlign: "center",
                  }}
                >
                  {row.runtime}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    color: COLORS.text,
                    padding: "20px 32px",
                    width: 320,
                    textAlign: "center",
                  }}
                >
                  {row.volume}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    color: COLORS.accent,
                    padding: "20px 32px",
                    width: 320,
                    textAlign: "center",
                  }}
                >
                  {row.mount}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
