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

const dataStores = [
  {
    icon: "🐘",
    title: "PostgreSQL",
    db: "clawchat",
    desc: "IM 数据：7 张表",
  },
  {
    icon: "🐘",
    title: "PostgreSQL",
    db: "clawchat_agent",
    desc: "Agent 数据：2 张表",
  },
  {
    icon: "⚡",
    title: "Redis",
    db: "缓存+队列",
    desc: "在线状态 + 消息队列",
  },
];

export const SceneArchData: React.FC = () => {
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
        {/* Title */}
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
          数据层
        </div>

        {/* Three cards */}
        <div style={{ display: "flex", gap: 32 }}>
          {dataStores.map((store, i) => {
            const cardProg = spring({
              frame: frame - 10 - i * 12,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={store.db}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  background: COLORS.card,
                  borderRadius: 16,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 360,
                  padding: "36px 28px",
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: 48 }}>{store.icon}</div>

                {/* Title */}
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {store.title}
                </div>

                {/* DB name */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    padding: "4px 14px",
                    borderRadius: 8,
                    background: "rgba(218,119,86,0.06)",
                    border: `1px solid rgba(218,119,86,0.15)`,
                  }}
                >
                  {store.db}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                    textAlign: "center",
                  }}
                >
                  {store.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
