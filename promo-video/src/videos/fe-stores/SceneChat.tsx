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

const actions = [
  { name: "createConversation", desc: "创建新会话，设为当前活跃" },
  { name: "addMessage", desc: "往 messagesByConversation 追加，同步更新 lastMessage" },
  { name: "updateMessage", desc: "通过 id 查找替换，支持 Partial<Message> patch" },
  { name: "setTyping", desc: "SSE 流式回复时标记 typing 状态" },
];

const STRUCTURE_CODE = `// messagesByConversation
{
  "conv-001": [msg1, msg2, ...],
  "conv-002": [msg3, msg4, ...],
}
// 切换会话 → 只改 activeConversationId
// 不替换整个消息数组`;

export const SceneChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

  const actionsTitleProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          chat-store 核心设计
        </div>

        {/* Two column layout */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Data structure */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-24, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 10,
                letterSpacing: 1,
              }}
            >
              数据结构 -- 按会话分组
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
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {STRUCTURE_CODE}
              </pre>
            </div>

            {/* selectConversation highlight */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: interpolate(
                  spring({ frame: frame - 50, fps, config: { damping: 14 } }),
                  [0, 1],
                  [0, 1]
                ),
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 20,
                  fontWeight: 700,
                  color: COLORS.accent,
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                selectConversation(id)
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  color: COLORS.muted,
                }}
              >
                O(1) 切换，无数组拷贝
              </div>
            </div>
          </div>

          {/* Right: Actions list */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 10,
                letterSpacing: 1,
                opacity: interpolate(actionsTitleProg, [0, 1], [0, 1]),
              }}
            >
              Actions -- 状态变更
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {actions.map((a, i) => {
                const delay = 35 + i * 10;
                const aProg = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={a.name}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "16px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      opacity: interpolate(aProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(aProg, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {a.name}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        color: COLORS.muted,
                      }}
                    >
                      {a.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
