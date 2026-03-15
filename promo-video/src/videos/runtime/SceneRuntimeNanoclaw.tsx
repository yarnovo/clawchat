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

const features = [
  "代码小、易理解、完全可定制",
  "独立 Docker 容器，OS 级隔离",
  "适合追求完全掌控的开发者",
];

export const SceneRuntimeNanoclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });

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
          NanoClaw
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          轻量可控
        </div>

        {/* Feature list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 28,
            marginTop: 12,
          }}
        >
          {features.map((text, i) => {
            const prog = spring({
              frame: frame - 18 - i * 10,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: COLORS.accent,
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    color: COLORS.text,
                    lineHeight: 1.5,
                  }}
                >
                  {text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
