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

const features = [
  { icon: "💬", label: "IM 核心", desc: "会话、消息、好友" },
  { icon: "⚡", label: "WebSocket", desc: "实时双向推送" },
  { icon: "📱", label: "跨平台", desc: "iOS / Android / Web" },
];

export const SceneChApp: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const phoneProg = spring({ frame: frame - 15, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
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
          Flutter App
        </div>

        {/* Phone + Features layout */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 60,
            opacity: interpolate(phoneProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(phoneProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Phone mockup */}
          <div
            style={{
              width: 240,
              height: 420,
              background: COLORS.card,
              borderRadius: 32,
              border: `3px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Status bar */}
            <div
              style={{
                height: 36,
                background: COLORS.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.white,
                }}
              >
                ClawChat
              </div>
            </div>

            {/* Chat messages */}
            <div
              style={{
                flex: 1,
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: COLORS.bg,
              }}
            >
              {[
                { r: "user", t: "帮我订个会议室" },
                { r: "agent", t: "好的，已预约下午3点的B201会议室" },
                { r: "user", t: "通知团队成员" },
                { r: "agent", t: "已发送通知给4位成员" },
              ].map((m, i) => {
                const msgProg = spring({
                  frame: frame - 30 - i * 12,
                  fps,
                  config: { damping: 14 },
                });
                const isUser = m.r === "user";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                      opacity: interpolate(msgProg, [0, 1], [0, 1]),
                    }}
                  >
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 13,
                        color: isUser ? COLORS.white : COLORS.text,
                        background: isUser ? COLORS.accent : COLORS.card,
                        padding: "6px 10px",
                        borderRadius: 10,
                        maxWidth: 160,
                        lineHeight: 1.4,
                        border: isUser ? "none" : `1px solid ${COLORS.border}`,
                      }}
                    >
                      {m.t}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div
              style={{
                padding: "8px 10px",
                borderTop: `1px solid ${COLORS.border}`,
                background: COLORS.card,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                  color: COLORS.subtle,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  background: COLORS.bg,
                }}
              >
                输入消息...
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {features.map((f, i) => {
              const fProg = spring({
                frame: frame - 25 - i * 10,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: "20px 28px",
                    boxShadow: COLORS.cardShadow,
                    minWidth: 320,
                    opacity: interpolate(fProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(fProg, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 40 }}>{f.icon}</div>
                  <div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 26,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {f.label}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 20,
                        color: COLORS.muted,
                        marginTop: 4,
                      }}
                    >
                      {f.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data flow */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            color: COLORS.muted,
            opacity: interpolate(
              spring({ frame: frame - 70, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: COLORS.text }}>Agent</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span style={{ color: COLORS.text }}>im-server</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span style={{ color: COLORS.text }}>WebSocket</span>
          <span style={{ color: COLORS.accent }}>→</span>
          <span style={{ color: COLORS.text }}>App</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
