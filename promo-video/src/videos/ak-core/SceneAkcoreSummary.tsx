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

const crossedItems = ["HTTP", "定时器", "技能系统"];

export const SceneAkcoreSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

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
        {/* Main line */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(mainProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(mainProg, [0, 1], [0.9, 1])})`,
          }}
        >
          Core = 纯粹的大脑
        </div>

        {/* Crossed-out items */}
        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
          }}
        >
          {crossedItems.map((item, i) => {
            const delay = 20 + i * 12;
            const itemProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            // Strikethrough line animation
            const strikeProg = spring({
              frame: frame - delay - 4,
              fps,
              config: { damping: 10, mass: 0.5 },
            });

            return (
              <div
                key={item}
                style={{
                  position: "relative",
                  opacity: interpolate(itemProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(itemProg, [0, 1], [16, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 36,
                    color: COLORS.subtle,
                    fontWeight: 500,
                  }}
                >
                  {item}
                </div>
                {/* Strikethrough line */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: -4,
                    height: 3,
                    borderRadius: 2,
                    background: COLORS.accent,
                    opacity: 0.7,
                    width: `${interpolate(strikeProg, [0, 1], [0, 108])}%`,
                    transform: "translateY(-50%)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Bottom clarification */}
        {(() => {
          const bottomProg = spring({
            frame: frame - 64,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.muted,
                opacity: interpolate(bottomProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(bottomProg, [0, 1], [12, 0])}px)`,
              }}
            >
              给它输入，它思考，给你输出
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
