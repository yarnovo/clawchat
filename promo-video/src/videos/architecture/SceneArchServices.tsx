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

const services = [
  { name: "im-server", port: "3000", desc: "IM 核心：账号、好友、会话、消息" },
  { name: "agent-server", port: "3004", desc: "Agent CRUD + 生命周期编排" },
  { name: "container-server", port: "3002", desc: "Docker 容器管理" },
  { name: "openclaw-server", port: "3003", desc: "OpenClaw 运行时编排" },
  { name: "nanoclaw-server", port: "3005", desc: "NanoClaw 运行时编排" },
  { name: "ironclaw-server", port: "3006", desc: "IronClaw 运行时编排" },
];

export const SceneArchServices: React.FC = () => {
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
          gap: 32,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          后端六服务
        </div>

        {/* Services table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            padding: "8px 0",
            width: 1000,
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
            {["服务名", "端口", "职责"].map((h, idx) => (
              <div
                key={h}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  fontWeight: 600,
                  color: COLORS.muted,
                  letterSpacing: 2,
                  width: idx === 0 ? 280 : idx === 1 ? 120 : 500,
                  flexShrink: 0,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {services.map((s, i) => {
            const delay = 12 + i * 6;
            const rowProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  padding: "10px 28px",
                  alignItems: "center",
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowProg, [0, 1], [40, 0])}px)`,
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 280,
                    flexShrink: 0,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {s.port}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    width: 500,
                    flexShrink: 0,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
