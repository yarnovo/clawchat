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

const limits = [
  { label: "Memory", value: "256 MB", icon: "💾" },
  { label: "CPU", value: "0.5 核", icon: "⚡" },
  { label: "PidsLimit", value: "100", icon: "🔢" },
];

const details = [
  { label: "RestartPolicy", value: "unless-stopped" },
  { label: "Healthcheck", value: "curl /health 每5s" },
  { label: "DNS 寻址", value: "http://{容器名}:4000" },
  { label: "Labels", value: "clawchat.managed=true" },
];

export const SceneSvcDocker: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Docker 实现细节
        </div>

        {/* Resource limits */}
        <div style={{ display: "flex", gap: 24 }}>
          {limits.map((lim, i) => {
            const prog = spring({
              frame: frame - 10 - i * 8,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={lim.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "20px 32px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                  minWidth: 180,
                }}
              >
                <div style={{ fontSize: 36 }}>{lim.icon}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {lim.value}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {lim.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Details list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "rgba(0,0,0,0.03)",
            borderRadius: 12,
            padding: "20px 32px",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {details.map((d, i) => {
            const prog = spring({
              frame: frame - 34 - i * 6,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={d.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 200,
                    whiteSpace: "pre",
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    whiteSpace: "pre",
                  }}
                >
                  {d.value}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
