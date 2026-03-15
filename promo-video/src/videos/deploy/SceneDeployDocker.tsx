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

const profiles = [
  { env: "本地开发", services: "PostgreSQL + Redis", cmd: "make dev" },
  { env: "线上部署", services: "全部 8 个服务", cmd: "docker compose --profile deploy up" },
];

export const SceneDeployDocker: React.FC = () => {
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
          Docker 容器化
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 960,
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
            {["环境", "服务", "命令"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  width: idx === 0 ? 180 : idx === 1 ? 320 : 420,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {profiles.map((p, i) => {
            const delay = 12 + i * 10;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={p.env}
                style={{
                  display: "flex",
                  padding: "16px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 180,
                    flexShrink: 0,
                  }}
                >
                  {p.env}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    width: 320,
                    flexShrink: 0,
                  }}
                >
                  {p.services}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: COLORS.accent,
                    width: 420,
                    flexShrink: 0,
                  }}
                >
                  {p.cmd}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
