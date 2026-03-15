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

const providers = ["百炼", "DeepSeek", "OpenRouter", "OpenAI"];

export const SceneAkpoIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 56,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          OpenAI Provider
        </div>

        {/* Provider names in a horizontal row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          {providers.map((name, i) => {
            const delay = 24 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });

            return (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 28 }}>
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 36,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 0.6]),
                    }}
                  >
                    ·
                  </div>
                )}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 36,
                    fontWeight: 600,
                    color: COLORS.accent,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          一个接口，通吃所有
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
