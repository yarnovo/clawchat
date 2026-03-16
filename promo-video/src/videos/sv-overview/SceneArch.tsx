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

const layers = [
  { label: "Frontend", sub: "Flutter Web / Mobile", icon: "📱" },
  { label: "Server", sub: "Hono · JWT · 路由", icon: "🖥️" },
  { label: "Agent Containers", sub: "Docker 内网 · DNS 寻址", icon: "🐳" },
];

export const SceneArch: React.FC = () => {
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
          gap: 36,
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
          网关架构
        </div>

        {/* Architecture flow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {layers.map((layer, i) => {
            const delay = 12 + i * 15;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const isServer = i === 1;
            return (
              <div key={layer.label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* Arrow between layers */}
                {i > 0 && (
                  <div
                    style={{
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      color: COLORS.subtle,
                      padding: "8px 0",
                    }}
                  >
                    ↕
                  </div>
                )}
                {/* Layer card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    padding: isServer ? "28px 48px" : "22px 40px",
                    background: COLORS.card,
                    borderRadius: 14,
                    border: `${isServer ? 2 : 1}px solid ${isServer ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                    minWidth: 520,
                  }}
                >
                  <div style={{ fontSize: 48 }}>{layer.icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: isServer ? 36 : 30,
                        fontWeight: 700,
                        color: isServer ? COLORS.accent : COLORS.text,
                        whiteSpace: "pre",
                      }}
                    >
                      {layer.label}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 22,
                        color: COLORS.muted,
                      }}
                    >
                      {layer.sub}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note */}
        <div
          style={{
            opacity: interpolate(frame, [70, 90], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            padding: "12px 28px",
            background: COLORS.card,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          Agent 容器不暴露端口，通过 Docker 内网 DNS 寻址
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
