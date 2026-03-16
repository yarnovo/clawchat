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

const stackItems = [
  { title: "TanStack Router", desc: "类型安全路由\n文件系统约定", icon: "🧭" },
  { title: "TanStack Query", desc: "数据缓存\n自动重新获取", icon: "🔄" },
  { title: "Zustand", desc: "轻量状态管理\n零样板代码", icon: "🐻" },
  { title: "SSE Streaming", desc: "fetch + ReadableStream\n实时流式响应", icon: "📡" },
  { title: "Dexie (IndexedDB)", desc: "客户端离线存储\n消息本地缓存", icon: "💾" },
  { title: "shadcn/ui", desc: "可定制组件库\n复制粘贴式集成", icon: "🎨" },
];

export const SceneStack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          技术栈精选
        </div>

        {/* 2x3 grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            maxWidth: 1500,
          }}
        >
          {stackItems.map((item, i) => {
            const delay = 12 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={item.title}
                style={{
                  width: 440,
                  padding: "24px 28px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 36 }}>{item.icon}</div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.accent,
                    }}
                  >
                    {item.title}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                    whiteSpace: "pre-line",
                    lineHeight: 1.5,
                  }}
                >
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
