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

const rootRouteCode = `const rootRoute = createRootRoute({
  component: function RootLayout() {
    useTheme()
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </TooltipProvider>
      </QueryClientProvider>
    )
  },
})`;

const routeTree = [
  { indent: 0, text: "rootRoute", tag: "Root", color: COLORS.accent },
  { indent: 1, text: "/  → redirect('/chat')", tag: "Redirect", color: COLORS.subtle },
  { indent: 1, text: "/chat", tag: "Eager", color: "#22863a" },
  { indent: 2, text: "/chat/$conversationId", tag: "Dynamic", color: COLORS.accent },
  { indent: 1, text: "/agents", tag: "Lazy", color: "#6f42c1" },
  { indent: 1, text: "/settings", tag: "Lazy", color: "#6f42c1" },
];

export const SceneRoutes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const treeProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
          router.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            createRootRoute + 5 子路由
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
          {/* Left: Root route code */}
          <div
            style={{
              flex: 1,
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
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              根路由 -- QueryClientProvider + AppShell
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
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {rootRouteCode}
              </pre>
            </div>
          </div>

          {/* Right: Route tree */}
          <div
            style={{
              flex: 1,
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
              路由树结构
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {routeTree.map((r, i) => {
                const rDelay = 35 + i * 8;
                const rProg = spring({
                  frame: frame - rDelay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginLeft: r.indent * 32,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "12px 18px",
                      opacity: interpolate(rProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(rProg, [0, 1], [16, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 13,
                        fontWeight: 700,
                        color: COLORS.white,
                        background: r.color,
                        padding: "2px 10px",
                        borderRadius: 4,
                        minWidth: 70,
                        textAlign: "center",
                        whiteSpace: "pre",
                      }}
                    >
                      {r.tag}
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 20,
                        color: COLORS.text,
                        whiteSpace: "pre",
                      }}
                    >
                      {r.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
