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

const rootLayoutCode = `const rootRoute = createRootRoute({
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

const lazyItems = [
  { name: "/agents", code: "lazyRouteComponent(() => import('./pages/agents'))", icon: "Lazy" },
  { name: "/settings", code: "lazyRouteComponent(() => import('./pages/settings'))", icon: "Lazy" },
];

const sharedFeatures = [
  { label: "AppShell", desc: "侧边栏 + 主内容区" },
  { label: "QueryClient", desc: "staleTime: 30s, retry: 1" },
  { label: "useTheme()", desc: "暗色主题切换" },
];

export const SceneLazy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.7 } });
  const lazyProg = spring({ frame: frame - 40, fps, config: { damping: 14, mass: 0.7 } });
  const featuresProg = spring({ frame: frame - 60, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
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
          懒加载 + 根布局
        </div>

        {/* Two columns */}
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: 1500,
          }}
        >
          {/* Root layout code */}
          <div
            style={{
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(codeProg, [0, 1], [30, 0])}px)`,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              maxWidth: 620,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
                marginBottom: 12,
              }}
            >
              Root Layout
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 17,
                color: COLORS.text,
                whiteSpace: "pre",
                lineHeight: 1.5,
              }}
            >
              {rootLayoutCode}
            </div>
          </div>

          {/* Right column: lazy + features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
            {/* Lazy loading items */}
            <div
              style={{
                opacity: interpolate(lazyProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(lazyProg, [0, 1], [20, 0])}px)`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  letterSpacing: 1,
                }}
              >
                懒加载路由
              </div>
              {lazyItems.map((item, i) => {
                const itemDelay = 40 + i * 10;
                const itemProg = spring({
                  frame: frame - itemDelay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={item.name}
                    style={{
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "14px 20px",
                      opacity: interpolate(itemProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(itemProg, [0, 1], [16, 0])}px)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <div
                        style={{
                          fontFamily: MONO,
                          fontSize: 14,
                          fontWeight: 700,
                          color: COLORS.white,
                          background: "#6f42c1",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: COLORS.text, whiteSpace: "pre" }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 14, color: COLORS.muted, whiteSpace: "pre" }}>
                      {item.code}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shared features */}
            <div
              style={{
                opacity: interpolate(featuresProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(featuresProg, [0, 1], [16, 0])}px)`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  letterSpacing: 1,
                }}
              >
                全局共享
              </div>
              {sharedFeatures.map((f, i) => {
                const fDelay = 60 + i * 8;
                const fProg = spring({
                  frame: frame - fDelay,
                  fps,
                  config: { damping: 14, mass: 0.6 },
                });
                return (
                  <div
                    key={f.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "10px 18px",
                      opacity: interpolate(fProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(fProg, [0, 1], [12, 0])}px)`,
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: COLORS.text, minWidth: 160, whiteSpace: "pre" }}>
                      {f.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.muted }}>
                      {f.desc}
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
