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

const stores = [
  { name: "chat-store", desc: "会话 + 消息", fields: ["conversations", "messagesByConversation", "activeConversationId", "isTyping"] },
  { name: "ui-store", desc: "侧边栏 + 主题", fields: ["sidebarOpen", "theme"] },
];

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleY = interpolate(titleProg, [0, 1], [-30, 0]);

  const badgeProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  const subtitleProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });

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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          Zustand 状态管理
        </div>

        {/* Badge */}
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.accent,
              padding: "10px 28px",
              borderRadius: 8,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.card,
              boxShadow: COLORS.cardShadow,
            }}
          >
            ~3KB gzipped
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
              letterSpacing: 2,
            }}
          >
            极简 &middot; 无 Provider &middot; 组件外可调用
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            letterSpacing: 1,
            marginTop: 8,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [16, 0])}px)`,
          }}
        >
          ClawChat 前端只有两个 Store
        </div>

        {/* Store cards */}
        <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
          {stores.map((s, i) => {
            const cardDelay = 35 + i * 14;
            const cardProg = spring({
              frame: frame - cardDelay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={s.name}
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 14,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 36px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  minWidth: 360,
                  opacity: interpolate(cardProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(cardProg, [0, 1], [24, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {s.desc}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  {s.fields.map((f, fi) => {
                    const tagDelay = cardDelay + 10 + fi * 5;
                    const tagProg = spring({
                      frame: frame - tagDelay,
                      fps,
                      config: { damping: 14, mass: 0.5 },
                    });
                    return (
                      <div
                        key={f}
                        style={{
                          fontFamily: MONO,
                          fontSize: 16,
                          color: COLORS.text,
                          padding: "4px 14px",
                          borderRadius: 16,
                          background: COLORS.bg,
                          border: `1px solid ${COLORS.border}`,
                          opacity: interpolate(tagProg, [0, 1], [0, 1]),
                          transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                        }}
                      >
                        {f}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
