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

const packages = [
  { name: "core", icon: "C" },
  { name: "tools", icon: "T" },
  { name: "eval", icon: "E" },
  { name: "channels", icon: "Ch" },
  { name: "scheduler", icon: "S" },
  { name: "cli", icon: ">" },
];

export const SceneAkIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const iconsProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          AgentKit 架构
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          六个包，从消息到回复的完整链路
        </div>

        {/* 6 package icons */}
        <div
          style={{
            display: "flex",
            gap: 28,
            opacity: interpolate(iconsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(iconsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {packages.map((pkg, i) => {
            const delay = 32 + i * 6;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={pkg.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(prog, [0, 1], [0.7, 1])})`,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    background: COLORS.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(218,119,86,0.2)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.white,
                    }}
                  >
                    {pkg.icon}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {pkg.name}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
