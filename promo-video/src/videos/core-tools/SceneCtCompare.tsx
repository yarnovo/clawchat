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

const bars = [
  { name: "IronClaw", count: 40, displayCount: "40+", color: "#7C5CBF", maxWidth: 900 },
  { name: "OpenClaw", count: 23, displayCount: "23", color: COLORS.accent, maxWidth: 518 },
  { name: "NanoClaw", count: 19, displayCount: "19", color: "#5B8DEF", maxWidth: 428 },
  { name: "agent-core", count: 13, displayCount: "13", color: "#2ECC71", maxWidth: 293 },
];

export const SceneCtCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const mottoDelay = 10 + bars.length * 10 + 10;
  const mottoProg = spring({ frame: frame - mottoDelay, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 12,
          }}
        >
          工具数量对比
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 1100 }}>
          {bars.map((bar, i) => {
            const delay = 10 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            const barWidth = interpolate(prog, [0, 1], [0, bar.maxWidth]);
            return (
              <div
                key={bar.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 140,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {bar.name}
                </div>
                <div
                  style={{
                    height: 48,
                    width: barWidth,
                    borderRadius: 10,
                    background: bar.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 16,
                    minWidth: 60,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.white,
                    }}
                  >
                    {bar.displayCount}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 700,
            color: COLORS.accent,
            marginTop: 12,
            opacity: interpolate(mottoProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(mottoProg, [0, 1], [0.8, 1])})`,
          }}
        >
          少即是多
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
