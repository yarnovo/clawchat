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
  { path: "/api/agents", desc: "Agent 生命周期管理", icon: "🤖" },
  { path: "/api/proxy", desc: "SSE 代理转发", icon: "🔀" },
  { path: "/api/market", desc: "Agent 市场", icon: "🏪" },
  { path: "/api/billing", desc: "用量追踪与计费", icon: "💰" },
  { path: "/api/skills", desc: "技能安装管理", icon: "🧩" },
];

export const SceneRoutes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          五个路由模块
        </div>

        {/* Route code header */}
        <div
          style={{
            opacity: interpolate(frame, [8, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: MONO,
            fontSize: 22,
            color: COLORS.muted,
            whiteSpace: "pre",
          }}
        >
          app.route('/api/*', ...)
        </div>

        {/* Route cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 900,
            width: "100%",
          }}
        >
          {routes.map((r, i) => {
            const delay = 15 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={r.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "18px 32px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 36 }}>{r.icon}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                    minWidth: 260,
                    whiteSpace: "pre",
                  }}
                >
                  {r.path}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                  }}
                >
                  {r.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
