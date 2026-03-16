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

const chatRouteCode = `// Chat routes
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat',
  component: lazyRouteComponent(
    () => import('./pages/chat')
  ),
})

const conversationRoute = createRoute({
  getParentRoute: () => chatRoute,
  path: '/$conversationId',
  component: lazyRouteComponent(
    () => import('./pages/chat/conversation')
  ),
})`;

const routeTreeCode = `// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute.addChildren([conversationRoute]),
  agentsRoute,
  settingsRoute,
])

// Type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}`;

const keyPoints = [
  { label: "getParentRoute", desc: "建立父子关系，嵌套 Outlet" },
  { label: "$conversationId", desc: "动态段，useParams 自动推断类型" },
  { label: "Register", desc: "全局注册，链接跳转有类型提示" },
];

export const SceneCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const chatProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const treeProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const pointsProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

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
          createRoute 链式定义
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            嵌套 + 类型推断
          </span>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "flex",
            gap: 28,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Chat route code */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(chatProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(chatProg, [0, 1], [-20, 0])}px)`,
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
              Chat 路由 + Conversation 子路由
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on $conversationId line */}
              <div
                style={{
                  position: "absolute",
                  top: 240,
                  left: 0,
                  right: 0,
                  height: 24,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {chatRouteCode}
              </pre>
            </div>
          </div>

          {/* Right: Route tree build + key points */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Route tree code */}
            <div
              style={{
                opacity: interpolate(treeProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(treeProg, [0, 1], [20, 0])}px)`,
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
                路由树组装 + 类型注册
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 24px",
                }}
              >
                <pre
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    lineHeight: 1.45,
                    color: COLORS.text,
                    margin: 0,
                    whiteSpace: "pre",
                  }}
                >
                  {routeTreeCode}
                </pre>
              </div>
            </div>

            {/* Key points */}
            <div
              style={{
                opacity: interpolate(pointsProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(pointsProg, [0, 1], [16, 0])}px)`,
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
                关键设计
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {keyPoints.map((kp, i) => {
                  const kpDelay = 65 + i * 8;
                  const kpProg = spring({
                    frame: frame - kpDelay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });
                  return (
                    <div
                      key={kp.label}
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        boxShadow: COLORS.cardShadow,
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        opacity: interpolate(kpProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(kpProg, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 18,
                          fontWeight: 700,
                          color: COLORS.accent,
                          minWidth: 180,
                          whiteSpace: "pre",
                        }}
                      >
                        {kp.label}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 17,
                          color: COLORS.muted,
                        }}
                      >
                        {kp.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
