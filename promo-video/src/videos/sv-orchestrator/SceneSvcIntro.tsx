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

const methods = [
  { name: "run(opts)", desc: "启动容器" },
  { name: "stop(id, timeout?)", desc: "停止并移除" },
  { name: "inspect(id)", desc: "查询状态" },
  { name: "list(filter?)", desc: "列出容器" },
  { name: "waitHealthy(name, timeout)", desc: "等待健康" },
];

export const SceneSvcIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        {/* Icon */}
        <div
          style={{
            transform: `scale(${iconScale})`,
            fontSize: 80,
          }}
        >
          📦
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Container Orchestrator
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          统一接口，多运行时适配
        </div>

        {/* Interface methods */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 16,
            background: "rgba(0,0,0,0.03)",
            borderRadius: 12,
            padding: "20px 32px",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {methods.map((m, i) => {
            const prog = spring({
              frame: frame - 30 - i * 5,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 380,
                    whiteSpace: "pre",
                  }}
                >
                  {m.name}
                </span>
                <span
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {m.desc}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
