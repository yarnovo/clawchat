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

const SHELL_CODE = `export function AppShell({ children }: AppShellProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [sheetOpen, setSheetOpen] = useState(false)

  if (isDesktop) {
    return (
      <div className="flex h-screen bg-background">
        {sidebarOpen && <Sidebar ... />}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    )
  }

  // Mobile layout
  return (
    <div className="flex h-screen flex-col">
      <MobileHeader onMenuClick={() => setSheetOpen(true)} />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar ... />
        </SheetContent>
      </Sheet>
      <main className="flex-1">{children}</main>
    </div>
  )
}`;

const FLOW_STEPS = [
  { label: "useMediaQuery", desc: "检测 768px 断点", mono: true },
  { label: "isDesktop ?", desc: "分支渲染逻辑", mono: false },
  { label: "Desktop: flex row", desc: "Sidebar + main(flex-1)", mono: false },
  { label: "Mobile: Sheet", desc: "side=\"left\" w-72", mono: false },
];

export const SceneShell: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  // Highlight pulse for key line (isDesktop check)
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
          app-shell.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginLeft: 16 }}>
            72 lines
          </span>
        </div>

        {/* Two-column layout */}
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
          {/* Left: Code block */}
          <div
            style={{
              flex: 1.2,
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
                padding: "20px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on useMediaQuery line */}
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              {/* Highlight on isDesktop check */}
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity * 0.6,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {SHELL_CODE}
              </pre>
            </div>
          </div>

          {/* Right: Flow diagram */}
          <div
            style={{
              flex: 0.8,
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
              渲染流程
            </div>
            {FLOW_STEPS.map((step, i) => {
              const stepProg = spring({
                frame: frame - 25 - i * 10,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div key={step.label}>
                  <div
                    style={{
                      opacity: interpolate(stepProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(stepProg, [0, 1], [16, 0])}px)`,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 10,
                      boxShadow: COLORS.cardShadow,
                      padding: "14px 18px",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    {/* Step number */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background: i === 0 ? COLORS.accent : COLORS.bg,
                        border: `1px solid ${i === 0 ? COLORS.accent : COLORS.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: MONO,
                        fontSize: 15,
                        fontWeight: 700,
                        color: i === 0 ? "#fff" : COLORS.text,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: step.mono ? MONO : FONT_SANS,
                          fontSize: 18,
                          fontWeight: 700,
                          color: COLORS.text,
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 15,
                          color: COLORS.muted,
                          marginTop: 2,
                        }}
                      >
                        {step.desc}
                      </div>
                    </div>
                  </div>
                  {/* Arrow connector */}
                  {i < FLOW_STEPS.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: "2px 0",
                        opacity: interpolate(stepProg, [0, 1], [0, 0.5]),
                      }}
                    >
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 18,
                          color: COLORS.subtle,
                        }}
                      >
                        ↓
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Key insight */}
            {(() => {
              const insightProg = spring({
                frame: frame - 70,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  style={{
                    opacity: interpolate(insightProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(insightProg, [0, 1], [10, 0])}px)`,
                    background: `${COLORS.accent}10`,
                    border: `1px solid ${COLORS.accent}30`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 15,
                      color: COLORS.accent,
                      fontWeight: 600,
                    }}
                  >
                    同一个 Sidebar 组件，两种渲染模式共用
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
