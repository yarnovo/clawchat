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

const components = [
  { name: "ChatHeader", desc: "Agent 名称 + 连接状态", icon: "H" },
  { name: "MessageList", desc: "消息列表 + 自动滚动", icon: "M" },
  { name: "InputArea", desc: "输入框 + 发送按钮", icon: "I" },
  { name: "TypingIndicator", desc: "Agent 思考中动画", icon: "T" },
];

const LAYOUT_CODE = `<div className="flex h-full flex-col">
  <ChatHeader name={agent.name}
    status={connectionStatus} />
  <MessageList messages={messages}
    onRetry={handleRetry} />
  <TypingIndicator visible={isTyping} />
  <InputArea value={input}
    onChange={setInput} onSend={handleSend} />
</div>`;

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const compsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${titleProg})`,
          }}
        >
          ChatPage
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          前端聊天核心 &mdash; 四个组件组装成完整对话界面
        </div>

        {/* Two-column: code + components */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "88%",
            maxWidth: 1500,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: JSX layout */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              组件组装 -- JSX 结构
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "24px 28px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {LAYOUT_CODE}
              </pre>
            </div>
          </div>

          {/* Right: Component cards */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              opacity: interpolate(compsProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(compsProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 4,
                letterSpacing: 1,
              }}
            >
              四个子组件
            </div>
            {components.map((c, i) => {
              const cardDelay = 40 + i * 10;
              const cardProg = spring({
                frame: frame - cardDelay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={c.name}
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    boxShadow: COLORS.cardShadow,
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    opacity: interpolate(cardProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(cardProg, [0, 1], [16, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: `${COLORS.accent}18`,
                      border: `1px solid ${COLORS.accent}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.accent,
                      flexShrink: 0,
                    }}
                  >
                    {c.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 16,
                        color: COLORS.muted,
                      }}
                    >
                      {c.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
