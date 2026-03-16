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

const INTERFACE_CODE = `interface ChatState {
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  activeConversationId: string | null
  isTyping: boolean

  selectConversation: (id: string | null) => void
  addMessage: (convId: string, msg: Message) => void
  updateMessage: (convId: string, msgId: string,
                  patch: Partial<Message>) => void
  setTyping: (typing: boolean) => void
  createConversation: (conv: Conversation) => void
}`;

const ADD_MESSAGE_CODE = `addMessage: (conversationId, message) =>
  set((state) => {
    const existing =
      state.messagesByConversation[conversationId] ?? []
    return {
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...existing, message],
      },
    }
  })`;

const UPDATE_MESSAGE_CODE = `updateMessage: (conversationId, messageId, patch) =>
  set((state) => {
    const existing =
      state.messagesByConversation[conversationId]
    if (!existing) return state
    return {
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: existing.map((m) =>
          m.id === messageId ? { ...m, ...patch } : m
        ),
      },
    }
  })`;

export const SceneChatStore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const interfaceProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const addProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const updateProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.12, 0.3, 0.12],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingTop: 40,
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
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          chat-store.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginLeft: 16 }}>
            64 lines
          </span>
        </div>

        {/* Three column layout */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "94%",
            maxWidth: 1700,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Interface */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(interfaceProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(interfaceProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              ChatState 接口
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on messagesByConversation line */}
              <div
                style={{
                  position: "absolute",
                  top: 50,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {INTERFACE_CODE}
              </pre>
            </div>
          </div>

          {/* Middle: addMessage */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(addProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(addProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              addMessage -- 追加到分组
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on spread + push line */}
              <div
                style={{
                  position: "absolute",
                  top: 120,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {ADD_MESSAGE_CODE}
              </pre>
            </div>
          </div>

          {/* Right: updateMessage */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(updateProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(updateProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 17,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              updateMessage -- id 查找替换
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 20px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on map + patch line */}
              <div
                style={{
                  position: "absolute",
                  top: 142,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {UPDATE_MESSAGE_CODE}
              </pre>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
