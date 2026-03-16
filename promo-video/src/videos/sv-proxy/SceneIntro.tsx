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
  { label: "Frontend", icon: "📱" },
  { label: "Server (鉴权 + 路由)", icon: "🔐" },
  { label: "Agent Container", icon: "🐳" },
];

export const SceneIntro: React.FC = () => {
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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          SSE Proxy
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          Server 最核心的功能
        </div>

        {/* Three-layer diagram horizontal */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {layers.map((layer, i) => {
            const delay = 20 + i * 12;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const isMiddle = i === 1;
            return (
              <div key={layer.label} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div
                    style={{
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                      fontFamily: MONO,
                      fontSize: 36,
                      color: COLORS.accent,
                      padding: "0 20px",
                    }}
                  >
                    ↔
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: isMiddle ? "24px 40px" : "20px 32px",
                    background: COLORS.card,
                    borderRadius: 14,
                    border: `${isMiddle ? 2 : 1}px solid ${isMiddle ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                  }}
                >
                  <div style={{ fontSize: 42 }}>{layer.icon}</div>
                  <div
                    style={{
                      fontFamily: isMiddle ? MONO : FONT_SANS,
                      fontSize: isMiddle ? 32 : 28,
                      fontWeight: isMiddle ? 700 : 500,
                      color: isMiddle ? COLORS.accent : COLORS.text,
                      whiteSpace: "pre",
                    }}
                  >
                    {layer.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key point */}
        <div
          style={{
            opacity: interpolate(frame, [65, 85], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            padding: "14px 32px",
            background: COLORS.card,
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          前端不直连容器 — 所有请求经 Server 鉴权后转发
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
