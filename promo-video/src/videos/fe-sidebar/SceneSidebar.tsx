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

const LAYERS = [
  {
    label: "Header",
    desc: "Logo + NewChat 按钮",
    icon: "C",
    color: COLORS.accent,
  },
  {
    label: "Search",
    desc: "搜索会话栏",
    icon: "🔍",
    color: COLORS.muted,
  },
  {
    label: "ScrollArea",
    desc: "可滚动会话列表",
    icon: "💬",
    color: COLORS.text,
  },
  {
    label: "Footer",
    desc: "Agent市场 + 设置 + 头像",
    icon: "⚙",
    color: COLORS.muted,
  },
];

const CONVERSATIONS = [
  { title: "Code Assistant", msg: "Sure, I can help you refactor...", time: "2m", isAgent: true, unread: 2, active: true },
  { title: "Alice", msg: "See you tomorrow!", time: "1h", isAgent: false, unread: 0, active: false },
  { title: "Translation Bot", msg: "Bonjour le monde", time: "3h", isAgent: true, unread: 0, active: false },
  { title: "Bob", msg: "Did you check the deployment?", time: "1d", isAgent: false, unread: 0, active: false },
  { title: "Writing Helper", msg: "Here's a revised version...", time: "1d", isAgent: true, unread: 1, active: false },
];

export const SceneSidebar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

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
          Sidebar
          <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginLeft: 16 }}>
            四层结构
          </span>
        </div>

        {/* Two-column: layers diagram + sidebar mockup */}
        <div
          style={{
            display: "flex",
            gap: 40,
            width: "90%",
            maxWidth: 1500,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Layer diagram */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {LAYERS.map((layer, i) => {
              const layerProg = spring({
                frame: frame - 12 - i * 10,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={layer.label}
                  style={{
                    opacity: interpolate(layerProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(layerProg, [0, 1], [-20, 0])}px)`,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    boxShadow: COLORS.cardShadow,
                    padding: i === 2 ? "24px 20px" : "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    borderLeft: `4px solid ${layer.color}`,
                    minHeight: i === 2 ? 120 : undefined,
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      lineHeight: 1,
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {layer.icon === "C" ? (
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: COLORS.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: MONO,
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        C
                      </div>
                    ) : (
                      layer.icon
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 22,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {layer.label}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        color: COLORS.muted,
                        marginTop: 4,
                      }}
                    >
                      {layer.desc}
                    </div>
                  </div>
                  {i === 2 && (
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 14,
                        color: COLORS.subtle,
                        whiteSpace: "pre",
                      }}
                    >
                      {"<ScrollArea>\n  flex-1\n</ScrollArea>"}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Dark mode note */}
            {(() => {
              const darkProg = spring({
                frame: frame - 60,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    opacity: interpolate(darkProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(darkProg, [0, 1], [12, 0])}px)`,
                    background: "#1E1E1E",
                    border: `1px solid #333`,
                    borderRadius: 10,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div style={{ fontSize: 22, lineHeight: 1 }}>🌙</div>
                  <div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 16,
                        color: "#E0E0E0",
                        whiteSpace: "pre",
                      }}
                    >
                      {"bg-sidebar  text-sidebar-foreground"}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 14,
                        color: "#888",
                        marginTop: 4,
                      }}
                    >
                      shadcn 主题变量 — 暗色模式自动切换
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right: Sidebar mockup */}
          <div
            style={{
              width: 320,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {(() => {
              const mockProg = spring({
                frame: frame - 25,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    opacity: interpolate(mockProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(mockProg, [0, 1], [20, 0])}px)`,
                    background: "#1C1C1E",
                    borderRadius: 14,
                    boxShadow: "0 4px 30px rgba(0,0,0,0.15)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: COLORS.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: MONO,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                        }}
                      >
                        C
                      </div>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: "#E0E0E0" }}>
                        ClawChat
                      </span>
                    </div>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_SANS,
                        fontSize: 14,
                        color: "#999",
                      }}
                    >
                      +
                    </div>
                  </div>

                  {/* Search */}
                  <div style={{ padding: "0 12px 8px" }}>
                    <div
                      style={{
                        height: 28,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 10px",
                      }}
                    >
                      <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: "#666" }}>
                        Search conversations...
                      </span>
                    </div>
                  </div>

                  {/* Separator */}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

                  {/* Conversation list */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: "6px 8px",
                      gap: 2,
                    }}
                  >
                    {CONVERSATIONS.map((conv, ci) => {
                      const convProg = spring({
                        frame: frame - 35 - ci * 6,
                        fps,
                        config: { damping: 14, mass: 0.5 },
                      });
                      return (
                        <div
                          key={conv.title}
                          style={{
                            opacity: interpolate(convProg, [0, 1], [0, 1]),
                            transform: `translateY(${interpolate(convProg, [0, 1], [8, 0])}px)`,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: conv.active ? "rgba(255,255,255,0.1)" : "transparent",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              background: conv.isAgent ? "rgba(218,119,86,0.2)" : "rgba(255,255,255,0.1)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: FONT_SANS,
                              fontSize: 12,
                              color: conv.isAgent ? COLORS.accent : "#999",
                              flexShrink: 0,
                            }}
                          >
                            {conv.isAgent ? "🤖" : conv.title[0]}
                          </div>
                          <div style={{ flex: 1, overflow: "hidden" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span
                                style={{
                                  fontFamily: FONT_SANS,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  color: "#E0E0E0",
                                }}
                              >
                                {conv.title}
                              </span>
                              <span
                                style={{
                                  fontFamily: FONT_SANS,
                                  fontSize: 9,
                                  color: "#666",
                                }}
                              >
                                {conv.time}
                              </span>
                            </div>
                            <div
                              style={{
                                fontFamily: FONT_SANS,
                                fontSize: 10,
                                color: "#666",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {conv.msg}
                            </div>
                          </div>
                          {conv.unread > 0 && (
                            <div
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                background: COLORS.accent,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontFamily: FONT_SANS,
                                fontSize: 9,
                                fontWeight: 600,
                                color: "#fff",
                                flexShrink: 0,
                              }}
                            >
                              {conv.unread}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Separator */}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      {["🏪", "⚙"].map((icon, i) => (
                        <div
                          key={i}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 14,
                          }}
                        >
                          {icon}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          background: "rgba(255,255,255,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: FONT_SANS,
                          fontSize: 10,
                          color: "#999",
                        }}
                      >
                        U
                      </div>
                      <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: "#999" }}>
                        User
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
