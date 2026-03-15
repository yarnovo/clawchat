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

const routes = [
  { path: "/v1/im/*", target: ":3000" },
  { path: "/v1/agents/*", target: ":3004" },
  { path: "/api/v1/*", target: ":3007" },
  { path: "/", target: "Flutter Web" },
];

export const SceneDeployNginx: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          Nginx 统一入口
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
            width: 780,
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
            {["路径", "目标"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.muted,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  width: idx === 0 ? 440 : 300,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {routes.map((r, i) => {
            const delay = 10 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={r.path}
                style={{
                  display: "flex",
                  padding: "14px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.text,
                    width: 440,
                    flexShrink: 0,
                  }}
                >
                  {r.path}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    fontWeight: 600,
                    width: 300,
                    flexShrink: 0,
                  }}
                >
                  {r.target}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.accent,
            padding: "8px 24px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(badgeProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          SSL + CORS + 安全头
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
