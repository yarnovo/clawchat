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

const pods = [
  { name: "Pod 1", status: "running" },
  { name: "Pod 2", status: "running" },
  { name: "Pod 3", status: "idle" },
  { name: "Pod 4", status: "running" },
];

const features = [
  { label: "k3s", desc: "轻量 K8s" },
  { label: "Hono", desc: "TypeScript 后端" },
  { label: "单台 ECS", desc: "一台机器全搞定" },
];

export const SceneBaK3s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const serverProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const featureProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          部署方案
        </div>

        {/* ECS box with pods */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            background: COLORS.card,
            border: `2px solid ${COLORS.border}`,
            borderRadius: 20,
            padding: "28px 40px",
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(serverProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(serverProg, [0, 1], [0.9, 1])})`,
          }}
        >
          {/* ECS header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              ECS + k3s
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
              }}
            >
              单台服务器
            </div>
          </div>

          {/* Backend service */}
          <div
            style={{
              background: COLORS.accent,
              borderRadius: 12,
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: COLORS.white }}>
              Backend
            </div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: "rgba(255,255,255,0.8)" }}>
              Hono + TypeScript
            </div>
          </div>

          {/* Pods grid */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {pods.map((pod, i) => {
              const delay = 25 + i * 8;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              const isRunning = pod.status === "running";
              return (
                <div
                  key={pod.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    background: isRunning ? "#B05A35" : COLORS.bg,
                    border: isRunning ? "none" : `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: "16px 28px",
                    minWidth: 140,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(prog, [0, 1], [0.8, 1])})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      fontWeight: 700,
                      color: isRunning ? COLORS.white : COLORS.text,
                    }}
                  >
                    {pod.name}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      color: isRunning ? "rgba(255,255,255,0.7)" : COLORS.muted,
                    }}
                  >
                    {pod.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom features */}
        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(featureProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(featureProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {features.map((feat, i) => {
            const prog = spring({
              frame: frame - 55 - i * 8,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={feat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {feat.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.text,
                  }}
                >
                  {feat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
