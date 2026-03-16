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

const STATE_CODE = `const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isTyping, setIsTyping] = useState(false);`;

const HANDLE_SEND_CODE = `const handleSend = useCallback(async () => {
  const text = input.trim();
  if (!text || isTyping) return;

  // 1. 添加用户消息
  const userMessage: Message = {
    id: crypto.randomUUID(),
    role: 'user', content: text,
    status: 'sent', timestamp: Date.now(),
  };
  setMessages(prev => [...prev, userMessage]);

  // 2. 调 fetch 发到 /api/chat
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  const data = await res.json();

  // 3. 收到回复后添加 Agent 消息
  const assistantMessage: Message = {
    role: 'assistant',
    content: data.reply,
    status: 'complete',
  };
  setMessages(prev => [...prev, assistantMessage]);
}, [input, isTyping]);`;

const threeSteps = [
  { num: "1", label: "添加用户消息", detail: "setMessages(prev => [...prev, userMessage])" },
  { num: "2", label: "fetch 发送到 API", detail: "await fetch('/api/chat', { ... })" },
  { num: "3", label: "添加 Agent 回复", detail: "setMessages(prev => [...prev, assistantMsg])" },
];

export const ScenePage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const stateProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const sendProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const stepsProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
          paddingTop: 44,
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
          chat-page.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            组装层
          </span>
        </div>

        {/* State + handleSend */}
        <div
          style={{
            display: "flex",
            gap: 24,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left column: state + steps */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* State */}
            <div
              style={{
                opacity: interpolate(stateProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(stateProg, [0, 1], [-20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                useState -- 三个状态
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `2px solid ${COLORS.accent}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "18px 22px",
                }}
              >
                <pre
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    lineHeight: 1.6,
                    color: COLORS.text,
                    margin: 0,
                    whiteSpace: "pre",
                  }}
                >
                  {STATE_CODE}
                </pre>
              </div>
            </div>

            {/* Three steps */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                opacity: interpolate(stepsProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(stepsProg, [0, 1], [16, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  letterSpacing: 1,
                  marginBottom: 2,
                }}
              >
                handleSend 三件事
              </div>
              {threeSteps.map((s, i) => {
                const sDelay = 60 + i * 10;
                const sProg = spring({
                  frame: frame - sDelay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={s.num}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      opacity: interpolate(sProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(sProg, [0, 1], [12, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: `${COLORS.accent}18`,
                        border: `1px solid ${COLORS.accent}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: MONO,
                        fontSize: 20,
                        fontWeight: 700,
                        color: COLORS.accent,
                        flexShrink: 0,
                      }}
                    >
                      {s.num}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 17, fontWeight: 600, color: COLORS.text }}>
                        {s.label}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 13, color: COLORS.subtle }}>
                        {s.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: handleSend code */}
          <div
            style={{
              flex: 1.2,
              opacity: interpolate(sendProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(sendProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              handleSend -- 完整流程
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 22px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {HANDLE_SEND_CODE}
              </pre>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
