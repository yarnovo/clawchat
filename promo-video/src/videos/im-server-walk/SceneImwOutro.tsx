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

const bullets = [
  "Hono 轻量框架，路由清晰",
  "Prisma ORM，类型安全",
  "JWT + bcrypt 认证",
  "游标分页 + 软删除",
  "Redis 异步队列解耦",
];

export const SceneImwOutro: React.FC = () => {
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          要点回顾
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: 680,
          }}
        >
          {bullets.map((b, i) => {
            const delay = 10 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 24px",
                  borderRadius: 10,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  ✅
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
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
