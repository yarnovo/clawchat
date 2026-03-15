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

const cards = [
  {
    title: "Flutter Widget",
    items: ["UI 组件隔离验证", "InMemoryTokenStore 注入", "mock HTTP 依赖"],
  },
  {
    title: "im-server Unit",
    items: ["JWT 模块测试", "vitest 框架", "CI 每次 push 自动跑"],
  },
];

export const SceneTestL1: React.FC = () => {
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
          gap: 40,
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
          L1 — 单元 / Widget 测试
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {cards.map((card, ci) => {
            const cardDelay = 12 + ci * 12;
            const cardProg = spring({
              frame: frame - cardDelay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={card.title}
                style={{
                  width: 440,
                  padding: "32px 36px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {card.title}
                </div>
                {card.items.map((item, ii) => {
                  const itemDelay = cardDelay + 8 + ii * 6;
                  const itemProg = spring({
                    frame: frame - itemDelay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });

                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(itemProg, [0, 1], [20, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          background: COLORS.accent,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 26,
                          color: COLORS.text,
                        }}
                      >
                        {item}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
