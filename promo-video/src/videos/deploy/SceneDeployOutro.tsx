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

const bullets = [
  "GitHub Actions 一键部署",
  "Docker 容器化全部服务",
  "Nginx 统一入口和路由",
  "Prisma 自动数据库迁移",
];

export const SceneDeployOutro: React.FC = () => {
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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
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
          {bullets.map((b, i) => {
            const delay = 15 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  ✅
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {b}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
