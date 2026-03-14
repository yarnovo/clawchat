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

const messages: Array<{
  from: "user" | "agent";
  text: string;
  showAt: number;
  isToolCall?: boolean;
}> = [
  { from: "user", text: "帮我查一下明天北京的天气", showAt: 10 },
  {
    from: "agent",
    text: "🔧 调用工具：weather.get_forecast",
    showAt: 50,
    isToolCall: true,
  },
  {
    from: "agent",
    text: "明天北京 晴 ☀️\n气温 15~25°C，适合出门\n紫外线中等，建议防晒",
    showAt: 80,
  },
  { from: "user", text: "帮我写一封请假邮件", showAt: 120 },
  {
    from: "agent",
    text: "🔧 调用工具：email.draft",
    showAt: 145,
    isToolCall: true,
  },
];

const ChatBubble: React.FC<{
  msg: (typeof messages)[0];
  frame: number;
  fps: number;
}> = ({ msg, frame, fps }) => {
  const localFrame = frame - msg.showAt;
  if (localFrame < 0) return null;

  const ent = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, mass: 0.6 },
  });
  const isUser = msg.from === "user";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        opacity: interpolate(ent, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 24,
            marginRight: 12,
            flexShrink: 0,
            boxShadow: COLORS.cardShadow,
          }}
        >
          🐾
        </div>
      )}
      <div
        style={{
          maxWidth: 420,
          padding: "14px 20px",
          borderRadius: isUser
            ? "18px 18px 4px 18px"
            : "18px 18px 18px 4px",
          background: isUser
            ? COLORS.accent
            : msg.isToolCall
              ? COLORS.bg
              : COLORS.card,
          border: msg.isToolCall
            ? `1px solid ${COLORS.border}`
            : isUser
              ? "none"
              : `1px solid ${COLORS.border}`,
          fontFamily: msg.isToolCall ? MONO : FONT_SANS,
          fontSize: msg.isToolCall ? 16 : 20,
          color: isUser
            ? "#fff"
            : msg.isToolCall
              ? COLORS.muted
              : COLORS.text,
          lineHeight: 1.6,
          whiteSpace: "pre-line",
          boxShadow: COLORS.cardShadow,
        }}
      >
        {msg.text}
      </div>
      {isUser && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 24,
            marginLeft: 12,
            flexShrink: 0,
          }}
        >
          👤
        </div>
      )}
    </div>
  );
};

// Typing indicator
const TypingIndicator: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const showAt = 25;
  const hideAt = 50;
  if (frame < showAt || frame >= hideAt) return null;

  const ent = spring({
    frame: frame - showAt,
    fps,
    config: { damping: 15, mass: 0.6 },
  });
  const dotPhase = (frame % 20) / 20;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: interpolate(ent, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(ent, [0, 1], [10, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 28,
          color: COLORS.muted,
          fontStyle: "italic",
        }}
      >
        正在输入
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: COLORS.subtle,
            opacity: interpolate(
              ((dotPhase + i * 0.3) % 1),
              [0, 0.5, 1],
              [0.3, 1, 0.3],
            ),
          }}
        />
      ))}
    </div>
  );
};

export const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 140,
        }}
      >
        {/* Phone mockup */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            width: 560,
            background: COLORS.card,
            borderRadius: 32,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 8px 60px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Status bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 24px",
              background: COLORS.bg,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
              }}
            >
              ← 返回
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: COLORS.accent,
                }}
              />
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                小助手
              </div>
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.accent,
              }}
            >
              在线
            </div>
          </div>

          {/* Chat area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: 20,
              minHeight: 480,
              background: COLORS.bg,
            }}
          >
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} frame={frame} fps={fps} />
            ))}
            <TypingIndicator frame={frame} fps={fps} />
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              background: COLORS.card,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                flex: 1,
                height: 40,
                borderRadius: 12,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
              }}
            />
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: COLORS.accent,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 28,
                color: "#fff",
              }}
            >
              ↑
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
