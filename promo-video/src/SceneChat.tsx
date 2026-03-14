import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { COLORS, FONT } from "./constants";

const messages: Array<{
  from: "user" | "agent";
  text: string;
  showAt: number;
  isToolCall?: boolean;
}> = [
  { from: "user", text: "帮我查一下明天北京的天气", showAt: 10 },
  { from: "agent", text: "🔧 调用工具：weather.get_forecast", showAt: 50, isToolCall: true },
  { from: "agent", text: "明天北京 晴 ☀️\n气温 15~25°C，适合出门\n紫外线中等，建议防晒", showAt: 80 },
  { from: "user", text: "帮我写一封请假邮件", showAt: 120 },
  { from: "agent", text: "🔧 调用工具：email.draft", showAt: 145, isToolCall: true },
];

const ChatBubble: React.FC<{
  msg: (typeof messages)[0];
  frame: number;
  fps: number;
}> = ({ msg, frame, fps }) => {
  const localFrame = frame - msg.showAt;
  if (localFrame < 0) return null;

  const ent = spring({ frame: localFrame, fps, config: { damping: 15, mass: 0.6 } });
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
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 22,
            marginRight: 12,
            flexShrink: 0,
            boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
          }}
        >
          🐾
        </div>
      )}
      <div
        style={{
          maxWidth: 420,
          padding: "14px 20px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? `linear-gradient(135deg, ${COLORS.accent}, #05a050)`
            : msg.isToolCall
              ? "rgba(108,99,255,0.12)"
              : "rgba(255,255,255,0.08)",
          border: msg.isToolCall
            ? "1px solid rgba(108,99,255,0.25)"
            : isUser
              ? "none"
              : "1px solid rgba(255,255,255,0.06)",
          fontFamily: msg.isToolCall ? "JetBrains Mono, SF Mono, monospace" : FONT,
          fontSize: msg.isToolCall ? 16 : 20,
          color: isUser ? "#fff" : msg.isToolCall ? "#a78bfa" : "rgba(255,255,255,0.9)",
          lineHeight: 1.6,
          whiteSpace: "pre-line",
          boxShadow: isUser
            ? "0 4px 20px rgba(7,193,96,0.25)"
            : msg.isToolCall
              ? "0 4px 20px rgba(108,99,255,0.15)"
              : "none",
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
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 22,
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

export const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0a2e", "#1a1a3e", "#0a0a2e"]} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}
      >
        {/* Phone mockup with glow */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            width: 560,
            background: "rgba(20,20,45,0.95)",
            borderRadius: 32,
            border: "1px solid rgba(108,99,255,0.15)",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(108,99,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
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
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              ← 返回
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: COLORS.accent,
                  boxShadow: "0 0 8px rgba(7,193,96,0.5)",
                }}
              />
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.white,
                }}
              >
                小助手
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 14, color: COLORS.accent }}>
              在线
            </div>
          </div>

          {/* Chat area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: "20px 20px",
              minHeight: 480,
            }}
          >
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} frame={frame} fps={fps} />
            ))}
          </div>

          {/* Input bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              background: "rgba(255,255,255,0.02)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 40,
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${COLORS.accent}, #05a050)`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 20,
                boxShadow: "0 4px 16px rgba(7,193,96,0.3)",
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
