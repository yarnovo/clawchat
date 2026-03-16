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

const SIDEBAR_CODE = `export function Sidebar({
  activeConversationId = "1",
  onConversationSelect,
  onNavigate,
}: SidebarProps) {
  return (
    <div className="flex h-full w-72 flex-col
         bg-sidebar text-sidebar-foreground">
      {/* Header: Logo + NewChat */}
      <div className="flex items-center justify-between px-4 py-3">
        ...
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <Input placeholder="Search..." className="h-8 pl-8" />
      </div>

      <Separator />

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {CONVERSATIONS.map((conv) => (
          <button
            className={cn(
              "flex w-full items-start gap-3 rounded-lg",
              activeConversationId === conv.id &&
                "bg-sidebar-accent"
            )}
          >
            <Avatar />
            <div>title + lastMessage + timestamp</div>
            {conv.unread > 0 && <Badge />}
          </button>
        ))}
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Tooltip><Store /></Tooltip>
        <Tooltip><Settings /></Tooltip>
        <Avatar>U</Avatar>
      </div>
    </div>
  )
}`;

const HIGHLIGHTS = [
  { label: "ScrollArea", desc: "shadcn 虚拟滚动容器", color: COLORS.accent },
  { label: "Avatar + Badge", desc: "头像、标题、摘要、时间、未读", color: COLORS.text },
  { label: "bg-sidebar-accent", desc: "当前选中项高亮", color: "#4CAF50" },
  { label: "Tooltip", desc: "底部图标按钮悬停提示", color: COLORS.muted },
];

export const SceneCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  // Highlight pulse
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
          sidebar.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginLeft: 16 }}>
            212 lines
          </span>
        </div>

        {/* Two-column */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "92%",
            maxWidth: 1650,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Code */}
          <div
            style={{
              flex: 1.3,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
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
              {/* Highlight on ScrollArea line */}
              <div
                style={{
                  position: "absolute",
                  top: 380,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              {/* Highlight on bg-sidebar-accent */}
              <div
                style={{
                  position: "absolute",
                  top: 456,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: "#4CAF50",
                  opacity: pulseOpacity * 0.7,
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
                {SIDEBAR_CODE}
              </pre>
            </div>
          </div>

          {/* Right: Key components */}
          <div
            style={{
              flex: 0.7,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              关键组件
            </div>
            {HIGHLIGHTS.map((h, i) => {
              const hProg = spring({
                frame: frame - 20 - i * 10,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={h.label}
                  style={{
                    opacity: interpolate(hProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(hProg, [0, 1], [16, 0])}px)`,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                    boxShadow: COLORS.cardShadow,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderLeft: `4px solid ${h.color}`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 18,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {h.label}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 15,
                        color: COLORS.muted,
                        marginTop: 2,
                      }}
                    >
                      {h.desc}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Conversation item anatomy */}
            {(() => {
              const anatomyProg = spring({
                frame: frame - 65,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    opacity: interpolate(anatomyProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(anatomyProg, [0, 1], [12, 0])}px)`,
                    marginTop: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 18,
                      fontWeight: 600,
                      color: COLORS.accent,
                      letterSpacing: 1,
                      marginBottom: 10,
                    }}
                  >
                    会话项结构
                  </div>
                  <div
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      boxShadow: COLORS.cardShadow,
                      padding: "16px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Avatar mock */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        background: `${COLORS.accent}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_SANS,
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      🤖
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 15, fontWeight: 600, color: COLORS.text }}>
                          Code Assistant
                        </span>
                        <span style={{ fontFamily: FONT_SANS, fontSize: 11, color: COLORS.subtle }}>
                          2m ago
                        </span>
                      </div>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 13, color: COLORS.muted, marginTop: 2 }}>
                        Sure, I can help you...
                      </div>
                    </div>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        background: COLORS.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_SANS,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      2
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
