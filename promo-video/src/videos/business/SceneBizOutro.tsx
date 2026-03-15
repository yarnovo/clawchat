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

const BULLETS = [
  "订阅保底，市场做增长",
  "八二分成，双向激励",
  "渐进式披露，先用户再变现",
  "网络效应驱动增长飞轮",
];

export const SceneBizOutro: React.FC = () => {
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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          要点回顾
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {BULLETS.map((text, i) => {
            const bulletProg = spring({
              frame: frame - 12 - i * 8,
              fps,
              config: { damping: 12, mass: 0.8 },
            });
            return (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(bulletProg, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(bulletProg, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    opacity: interpolate(bulletProg, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(bulletProg, [0, 1], [0.5, 1])})`,
                  }}
                >
                  ✅
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 500,
                    color: COLORS.text,
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
