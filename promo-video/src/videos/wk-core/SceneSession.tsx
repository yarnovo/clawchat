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

const INTERFACE_CODE = `interface ChatSession {
  getMessages(): ChatMessage[];
  addMessage(message: ChatMessage): void;
  clear(): void;
}`;

const IMPL_CODE = `class InMemorySession implements ChatSession {
  private msgs: ChatMessage[] = [];

  getMessages(): ChatMessage[] {
    return [...this.msgs];
  }

  addMessage(message: ChatMessage): void {
    this.msgs.push(message);
  }

  clear(): void {
    this.msgs = [];
  }
}`;

const methods = [
  { name: "getMessages()", desc: "返回消息数组的浅拷贝", detail: "return [...this.msgs]" },
  { name: "addMessage(msg)", desc: "追加一条消息", detail: "this.msgs.push(msg)" },
  { name: "clear()", desc: "清空全部历史", detail: "this.msgs = []" },
];

export const SceneSession: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const interfaceProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const implProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const methodsProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 72, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
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
          session.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            15 lines
          </span>
        </div>

        {/* Two-column: interface + implementation */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "88%",
            maxWidth: 1500,
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
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              ChatSession -- 接口契约
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `2px solid ${COLORS.accent}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "24px 28px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 20,
                  lineHeight: 1.6,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {INTERFACE_CODE}
              </pre>
            </div>
          </div>

          {/* Right: Implementation */}
          <div
            style={{
              flex: 1.3,
              opacity: interpolate(implProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(implProg, [0, 1], [20, 0])}px)`,
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
              InMemorySession -- 数组实现
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
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {IMPL_CODE}
              </pre>
            </div>
          </div>
        </div>

        {/* Method breakdown cards */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "88%",
            maxWidth: 1500,
            opacity: interpolate(methodsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(methodsProg, [0, 1], [16, 0])}px)`,
          }}
        >
          {methods.map((m, i) => {
            const mDelay = 50 + i * 10;
            const mProg = spring({
              frame: frame - mDelay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={m.name}
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
                  opacity: interpolate(mProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(mProg, [0, 1], [12, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {m.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 16,
                    color: COLORS.muted,
                  }}
                >
                  {m.desc}
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
                  {m.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 24,
            color: COLORS.subtle,
            letterSpacing: 2,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagProg, [0, 1], [8, 0])}px)`,
          }}
        >
          15 行代码，可替换为 Redis / SQLite / 任意存储
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
