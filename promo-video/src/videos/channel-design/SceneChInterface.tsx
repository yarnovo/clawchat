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

const methods = [
  {
    name: "connect()",
    desc: "建立连接",
    icon: "🔌",
  },
  {
    name: "onMessage()",
    desc: "接收消息",
    icon: "📩",
  },
  {
    name: "sendMessage()",
    desc: "发送回复",
    icon: "📤",
  },
  {
    name: "disconnect()",
    desc: "断开连接",
    icon: "🔒",
  },
];

export const SceneChInterface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subtitleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });

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
        {/* Title */}
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
          Channel 接口
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
          }}
        >
          每个渠道只需实现 4 个方法
        </div>

        {/* Method cards */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 8,
          }}
        >
          {methods.map((m, i) => {
            const cardProg = spring({
              frame: frame - 20 - i * 12,
              fps,
              config: { damping: 12, mass: 0.7 },
            });
            return (
              <div
                key={m.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "32px 36px",
                  boxShadow: COLORS.cardShadow,
                  minWidth: 200,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [40, 0])}px) scale(${interpolate(cardProg, [0, 1], [0.9, 1])})`,
                }}
              >
                <div style={{ fontSize: 48 }}>{m.icon}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.text,
                  }}
                >
                  {m.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Supported channels */}
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 8,
            opacity: interpolate(
              spring({ frame: frame - 70, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          {["Web", "Telegram", "WhatsApp", "Slack", "Discord"].map((ch) => (
            <div
              key={ch}
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.muted,
                padding: "6px 18px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
              }}
            >
              {ch}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
