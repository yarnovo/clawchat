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

const ROLE_CODE = `export function MessageBubble({ message, onRetry }) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isSending = message.status === 'sending';

  return (
    <div className={cn('flex',
      isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('rounded-2xl px-4 py-3',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'border bg-card text-card-foreground',
        isSending && 'opacity-50',
        isError && 'border-destructive/30',
      )}>
        {isUser
          ? <p>{message.content}</p>
          : <MarkdownRenderer content={...} />}
      </div>
    </div>
  );
}`;

const statusStates = [
  { status: "sent", style: "正常显示", visual: "opacity: 1", color: COLORS.text },
  { status: "sending", style: "半透明", visual: "opacity: 0.5", color: COLORS.subtle },
  { status: "error", style: "红色底 + 重试", visual: "bg-destructive/5", color: "#C0392B" },
];

const RETRY_CODE = `{isError && (
  <button onClick={() => onRetry?.(message.id)}>
    <RotateCw className="size-3" />
    Retry
  </button>
)}`;

export const SceneBubble: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const statusProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const retryProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.15, 0.35, 0.15],
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
          gap: 22,
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
          message-bubble.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            role 驱动渲染
          </span>
        </div>

        {/* Two-column layout */}
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
          {/* Left: main code */}
          <div
            style={{
              flex: 1.2,
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
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              条件渲染 -- user vs agent
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "18px 22px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight pulse on role check line */}
              <div
                style={{
                  position: "absolute",
                  top: 28,
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
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {ROLE_CODE}
              </pre>
            </div>
          </div>

          {/* Right: status + retry */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Status states */}
            <div
              style={{
                opacity: interpolate(statusProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(statusProg, [0, 1], [20, 0])}px)`,
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
                status 状态映射
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {statusStates.map((s, i) => {
                  const sDelay = 40 + i * 10;
                  const sProg = spring({
                    frame: frame - sDelay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });
                  return (
                    <div
                      key={s.status}
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
                          fontFamily: MONO,
                          fontSize: 18,
                          fontWeight: 700,
                          color: s.color,
                          minWidth: 90,
                        }}
                      >
                        {s.status}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 16,
                          color: COLORS.muted,
                        }}
                      >
                        {s.style}
                      </div>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 13,
                          color: COLORS.subtle,
                          marginLeft: "auto",
                        }}
                      >
                        {s.visual}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Retry button code */}
            <div
              style={{
                opacity: interpolate(retryProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(retryProg, [0, 1], [16, 0])}px)`,
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
                error -- 重试按钮
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "16px 20px",
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
                  {RETRY_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
