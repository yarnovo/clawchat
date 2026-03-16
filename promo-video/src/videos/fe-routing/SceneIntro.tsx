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

const routes = [
  { path: "/", desc: "重定向到 /chat", type: "redirect" },
  { path: "/chat", desc: "聊天列表", type: "page" },
  { path: "/chat/$conversationId", desc: "会话详情（动态路由）", type: "dynamic" },
  { path: "/agents", desc: "Agent 市场", type: "lazy" },
  { path: "/settings", desc: "设置页面", type: "lazy" },
];

const typeColor: Record<string, string> = {
  redirect: COLORS.subtle,
  page: "#22863a",
  dynamic: COLORS.accent,
  lazy: "#6f42c1",
};

const typeLabel: Record<string, string> = {
  redirect: "redirect",
  page: "eager",
  dynamic: "dynamic",
  lazy: "lazy",
};

export const SceneIntro: React.FC = () => {
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
          gap: 32,
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          TanStack Router
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
          }}
        >
          端到端类型安全 · 5 条路由
        </div>

        {/* Route tree visualization */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 900,
            width: "100%",
            alignItems: "center",
          }}
        >
          {routes.map((route, i) => {
            const delay = 18 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const indent = route.path === "/chat/$conversationId" ? 40 : 0;
            return (
              <div
                key={route.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 28px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
                  width: 800,
                  marginLeft: indent,
                }}
              >
                {/* Type badge */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 16,
                    fontWeight: 700,
                    color: COLORS.white,
                    background: typeColor[route.type],
                    padding: "4px 12px",
                    borderRadius: 6,
                    minWidth: 80,
                    textAlign: "center",
                    whiteSpace: "pre",
                  }}
                >
                  {typeLabel[route.type]}
                </div>
                {/* Path */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.text,
                    minWidth: 340,
                    whiteSpace: "pre",
                  }}
                >
                  {route.path}
                </div>
                {/* Desc */}
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {route.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
