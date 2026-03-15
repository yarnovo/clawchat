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

const chatMessages = [
  { role: "user", text: "你好，帮我查一下天气" },
  { role: "agent", text: "好的，正在查询北京天气..." },
  { role: "agent", text: "今天晴，25°C，适合出行" },
];

export const SceneChWeb: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const browserProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
          Web 聊天
        </div>

        {/* Browser mockup */}
        <div
          style={{
            width: 700,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
            opacity: interpolate(browserProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(browserProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Browser toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderBottom: `1px solid ${COLORS.border}`,
              background: COLORS.bg,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {["#FF5F57", "#FFBD2E", "#28CA41"].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: c,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                background: COLORS.card,
                borderRadius: 6,
                padding: "4px 12px",
                fontFamily: MONO,
                fontSize: 14,
                color: COLORS.muted,
                textAlign: "center",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              localhost:3000/chat
            </div>
          </div>

          {/* Chat area */}
          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minHeight: 240,
            }}
          >
            {chatMessages.map((msg, i) => {
              const msgProg = spring({
                frame: frame - 30 - i * 15,
                fps,
                config: { damping: 14 },
              });
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    opacity: interpolate(msgProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(msgProg, [0, 1], [15, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      color: isUser ? COLORS.white : COLORS.text,
                      background: isUser ? COLORS.accent : COLORS.bg,
                      padding: "12px 20px",
                      borderRadius: 16,
                      borderTopRightRadius: isUser ? 4 : 16,
                      borderTopLeftRadius: isUser ? 16 : 4,
                      maxWidth: 420,
                      lineHeight: 1.5,
                      border: isUser ? "none" : `1px solid ${COLORS.border}`,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              padding: "12px 16px",
              borderTop: `1px solid ${COLORS.border}`,
              gap: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.subtle,
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bg,
              }}
            >
              输入消息...
            </div>
          </div>
        </div>

        {/* Tech note */}
        <div
          style={{
            display: "flex",
            gap: 16,
            opacity: interpolate(
              spring({ frame: frame - 75, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
          }}
        >
          {["HTTP + SSE", "HTML + JS", "无需框架"].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.accent,
                padding: "6px 18px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
