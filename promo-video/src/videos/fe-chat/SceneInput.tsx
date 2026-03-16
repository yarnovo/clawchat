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

const INPUT_CODE = `<TextareaAutosize
  value={value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Type a message..."
  minRows={1}
  maxRows={6}
/>`;

const SEND_CODE = `const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (canSend) onSend();
  }
};`;

const OPTIMISTIC_CODE = `// 乐观更新 — 不等服务器
setMessages(prev => [...prev, userMessage]);
setInput('');
setIsTyping(true);

const res = await fetch('/api/chat', { ... });
// 收到回复后追加 Agent 消息`;

const keyFeatures = [
  { name: "自动伸缩", detail: "minRows=1, maxRows=6", desc: "输入多行时自动变高" },
  { name: "Enter 发送", detail: "Shift+Enter 换行", desc: "符合 IM 习惯" },
  { name: "乐观更新", detail: "立即显示用户消息", desc: "不等服务器确认" },
];

export const SceneInput: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const textareaProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const sendProg = spring({ frame: frame - 32, fps, config: { damping: 14 } });
  const optimisticProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const featuresProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });

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
          paddingTop: 50,
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
          InputArea
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            输入 + 发送 + 乐观更新
          </span>
        </div>

        {/* Three code blocks */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "90%",
            maxWidth: 1600,
          }}
        >
          {/* TextareaAutosize */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(textareaProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(textareaProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              自动伸缩 Textarea
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
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {INPUT_CODE}
              </pre>
            </div>
          </div>

          {/* Enter to send */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(sendProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(sendProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              键盘事件处理
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
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {SEND_CODE}
              </pre>
            </div>
          </div>

          {/* Optimistic update */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(optimisticProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(optimisticProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              乐观更新流程
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
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {OPTIMISTIC_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "88%",
            maxWidth: 1500,
            opacity: interpolate(featuresProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(featuresProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {keyFeatures.map((f, i) => {
            const fDelay = 70 + i * 10;
            const fProg = spring({
              frame: frame - fDelay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={f.name}
                style={{
                  flex: 1,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "18px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  opacity: interpolate(fProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(fProg, [0, 1], [12, 0])}px)`,
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
                  {f.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 16,
                    color: COLORS.muted,
                  }}
                >
                  {f.desc}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: COLORS.accent,
                    padding: "4px 10px",
                    background: `${COLORS.accent}11`,
                    borderRadius: 6,
                    alignSelf: "flex-start",
                  }}
                >
                  {f.detail}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
