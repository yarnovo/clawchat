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

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  // Desktop layout spring
  const desktopProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  // Mobile layout spring
  const mobileProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  // Arrow between them
  const arrowProg = spring({ frame: frame - 45, fps, config: { damping: 16, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingTop: 60,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          AppShell
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.muted,
              marginLeft: 16,
            }}
          >
            自适应布局壳
          </span>
        </div>

        {/* Two layout demos side by side */}
        <div
          style={{
            display: "flex",
            gap: 60,
            alignItems: "flex-start",
            justifyContent: "center",
            width: "90%",
            maxWidth: 1500,
          }}
        >
          {/* Desktop layout diagram */}
          <div
            style={{
              opacity: interpolate(desktopProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(desktopProg, [0, 1], [-30, 0])}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
              }}
            >
              {"Desktop (>= 768px)"}
            </div>
            {/* Desktop mockup */}
            <div
              style={{
                width: 600,
                height: 420,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                boxShadow: COLORS.cardShadow,
                overflow: "hidden",
                display: "flex",
              }}
            >
              {/* Sidebar */}
              <div
                style={{
                  width: 72,
                  background: "#2C2C2C",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: 16,
                  gap: 12,
                }}
              >
                {/* Logo */}
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
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  C
                </div>
                {/* Nav items */}
                {[0, 1, 2, 3].map((j) => {
                  const itemProg = spring({
                    frame: frame - 30 - j * 5,
                    fps,
                    config: { damping: 14, mass: 0.5 },
                  });
                  return (
                    <div
                      key={j}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: j === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                        transform: `scale(${interpolate(itemProg, [0, 1], [0.6, 1])})`,
                      }}
                    />
                  );
                })}
              </div>
              {/* Main content */}
              <div
                style={{
                  flex: 1,
                  borderLeft: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  padding: 20,
                  gap: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 14,
                    color: COLORS.muted,
                    whiteSpace: "pre",
                  }}
                >
                  {"flex: 1  /* 页面区域 */"}
                </div>
                {/* Placeholder content blocks */}
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    style={{
                      height: j === 0 ? 60 : 40,
                      borderRadius: 8,
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {"flex h-screen  →  Sidebar(w-72) + main(flex-1)"}
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: 200,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(arrowProg, [0, 1], [0.5, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 44,
                color: COLORS.accent,
                fontWeight: 300,
              }}
            >
              {"⇌"}
            </div>
          </div>

          {/* Mobile layout diagram */}
          <div
            style={{
              opacity: interpolate(mobileProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(mobileProg, [0, 1], [30, 0])}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
                letterSpacing: 1,
              }}
            >
              Mobile ({"<"} 768px)
            </div>
            {/* Mobile mockup */}
            <div
              style={{
                width: 300,
                height: 420,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                boxShadow: COLORS.cardShadow,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Mobile header */}
              <div
                style={{
                  height: 48,
                  borderBottom: `1px solid ${COLORS.border}`,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 14px",
                  gap: 10,
                }}
              >
                {/* Hamburger */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {[0, 1, 2].map((k) => (
                    <div
                      key={k}
                      style={{
                        width: 18,
                        height: 2,
                        background: COLORS.text,
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  ClawChat
                </div>
              </div>
              {/* Main content */}
              <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    style={{
                      height: j === 0 ? 50 : 35,
                      borderRadius: 8,
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  />
                ))}
              </div>
              {/* Sheet overlay (half-pulled) */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: "75%",
                  background: "#2C2C2C",
                  borderRadius: "0 14px 14px 0",
                  boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
                  opacity: interpolate(mobileProg, [0.5, 1], [0, 0.95], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  transform: `translateX(${interpolate(mobileProg, [0.5, 1], [-100, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}%)`,
                  display: "flex",
                  flexDirection: "column",
                  padding: 14,
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    whiteSpace: "pre",
                  }}
                >
                  {"<Sheet side=\"left\">"}
                </div>
                {[0, 1, 2, 3].map((j) => (
                  <div
                    key={j}
                    style={{
                      height: 28,
                      borderRadius: 6,
                      background: j === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: COLORS.text,
                whiteSpace: "pre",
              }}
            >
              {"Sheet(side=\"left\")  ←  hamburger"}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
