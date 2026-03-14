import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

export const SceneMpSpeed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const bars = [
    { label: "官方源 (美国)", ms: 3200, color: COLORS.subtle },
    { label: "ClawChat (国内)", ms: 180, color: COLORS.accent },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
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
          国内加速，极速安装
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            width: 800,
          }}
        >
          {bars.map((bar, i) => {
            const delay = 20 + i * 18;
            const barProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 18, mass: 1 },
            });
            const widthPercent = (bar.ms / 3200) * 100;

            return (
              <div
                key={bar.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  opacity: interpolate(barProg, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 600,
                      color: COLORS.text,
                    }}
                  >
                    {bar.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      fontWeight: 800,
                      color: bar.color,
                    }}
                  >
                    {bar.ms}ms
                  </div>
                </div>
                <div
                  style={{
                    height: 28,
                    borderRadius: 14,
                    background: COLORS.border,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${interpolate(barProg, [0, 1], [0, widthPercent])}%`,
                      borderRadius: 14,
                      background: bar.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 44,
            fontWeight: 800,
            color: COLORS.accent,
            opacity: interpolate(
              spring({ frame: frame - 60, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          快 17 倍
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
