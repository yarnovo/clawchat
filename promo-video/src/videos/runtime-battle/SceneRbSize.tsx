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

const runtimes = [
  { name: "OpenClaw", size: "~200MB", ratio: 1.0, note: "Node.js 运行时" },
  { name: "IronClaw", size: "~50MB", ratio: 0.25, note: "Rust 单二进制" },
  { name: "NanoClaw", size: "~200MB", ratio: 1.0, note: "Node.js · 核心代码极少" },
];

const BAR_MAX_WIDTH = 900;

export const SceneRbSize: React.FC = () => {
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            marginBottom: 8,
          }}
        >
          容器体积对比
        </div>

        {runtimes.map((rt, i) => {
          const delay = 10 + i * 15;
          const prog = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, mass: 0.8 },
          });
          const barWidth = interpolate(prog, [0, 1], [0, BAR_MAX_WIDTH * rt.ratio]);

          return (
            <div
              key={rt.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                width: 1300,
                opacity: interpolate(prog, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.accent,
                  width: 160,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {rt.name}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 8,
                  background: COLORS.border,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: barWidth,
                    height: "100%",
                    borderRadius: 8,
                    background: COLORS.accent,
                    opacity: 0.7,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.text,
                  width: 120,
                  flexShrink: 0,
                }}
              >
                {rt.size}
              </div>
            </div>
          );
        })}

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 16,
          }}
        >
          {runtimes.map((rt, i) => {
            const delay = 50 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={rt.name}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                {rt.name}: {rt.note}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
