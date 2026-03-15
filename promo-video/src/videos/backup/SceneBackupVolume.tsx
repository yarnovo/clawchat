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

export const SceneBackupVolume: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.accent,
              padding: "6px 16px",
              background: "rgba(218,119,86,0.08)",
              borderRadius: 8,
              border: `1px solid rgba(218,119,86,0.15)`,
            }}
          >
            防线 4
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            Volume 持久化
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          每个 Agent 容器的数据持久化到 Docker Volume
        </div>

        {/* Volume mount table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 920,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              padding: "10px 28px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            {["运行时", "Volume 名称", "挂载路径"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 180 : idx === 1 ? 400 : 280,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {mounts.map((m, i) => {
            const delay = 15 + i * 8;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={m.runtime}
                style={{
                  display: "flex",
                  padding: "12px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 180,
                    flexShrink: 0,
                  }}
                >
                  {m.runtime}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.text,
                    width: 400,
                    flexShrink: 0,
                  }}
                >
                  {m.volume}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    width: 280,
                    flexShrink: 0,
                  }}
                >
                  {m.mount}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(
              spring({ frame: frame - 50, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          容器删除后 Volume 保留，可恢复 Agent 数据
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
