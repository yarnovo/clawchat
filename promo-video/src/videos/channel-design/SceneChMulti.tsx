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

const channels = [
  { name: "Web", icon: "🌐", hasCredential: true },
  { name: "Telegram", icon: "✈️", hasCredential: true },
  { name: "Slack", icon: "💼", hasCredential: true },
  { name: "Discord", icon: "🎮", hasCredential: false },
  { name: "WhatsApp", icon: "📱", hasCredential: false },
];

export const SceneChMulti: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subtitleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const loopProg = spring({ frame: frame - 80, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Channel Registry
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
          }}
        >
          有凭证就连，没有就跳过
        </div>

        {/* Channel grid */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginTop: 8,
          }}
        >
          {channels.map((ch, i) => {
            const cardProg = spring({
              frame: frame - 20 - i * 8,
              fps,
              config: { damping: 12, mass: 0.7 },
            });
            const connected = ch.hasCredential;
            return (
              <div
                key={ch.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  background: connected ? COLORS.card : COLORS.bg,
                  border: `2px solid ${connected ? COLORS.accent : COLORS.border}`,
                  borderRadius: 16,
                  padding: "28px 32px",
                  boxShadow: connected ? "0 4px 20px rgba(218,119,86,0.12)" : "none",
                  opacity: interpolate(cardProg, [0, 1], [connected ? 0 : 0.3, connected ? 1 : 0.45]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [30, 0])}px)`,
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: 44 }}>{ch.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 600,
                    color: connected ? COLORS.text : COLORS.subtle,
                  }}
                >
                  {ch.name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    color: connected ? COLORS.accent : COLORS.subtle,
                    padding: "4px 14px",
                    borderRadius: 6,
                    background: connected ? "rgba(218,119,86,0.08)" : "transparent",
                    border: `1px solid ${connected ? COLORS.accent : COLORS.border}`,
                  }}
                >
                  {connected ? "connected" : "skipped"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message loop */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
            opacity: interpolate(loopProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(loopProg, [0, 1], [15, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              color: COLORS.muted,
              padding: "10px 24px",
              borderRadius: 10,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            while (true) {"{"} await processMessage() {"}"}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 20,
              color: COLORS.muted,
            }}
          >
            消息统一汇聚
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
