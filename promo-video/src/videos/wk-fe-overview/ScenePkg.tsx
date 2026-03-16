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

const groups = [
  {
    label: "Core Framework",
    deps: [
      { name: "react", ver: "^19.2.4" },
      { name: "react-dom", ver: "^19.2.4" },
      { name: "vite", ver: "^8.0.0" },
    ],
  },
  {
    label: "Styling",
    deps: [
      { name: "tailwindcss", ver: "^4.2.1" },
      { name: "shadcn", ver: "^4.0.8" },
      { name: "tw-animate-css", ver: "^1.4.0" },
    ],
  },
  {
    label: "Routing & State",
    deps: [
      { name: "@tanstack/react-router", ver: "^1.167.1" },
      { name: "@tanstack/react-query", ver: "^5.90.21" },
      { name: "zustand", ver: "^5.0.11" },
    ],
  },
  {
    label: "Data & Rendering",
    deps: [
      { name: "dexie", ver: "^4.3.0" },
      { name: "react-markdown", ver: "^10.1.0" },
      { name: "lucide-react", ver: "^0.577.0" },
    ],
  },
];

export const ScenePkg: React.FC = () => {
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
          package.json
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            dependencies
          </span>
        </div>

        {/* Groups 2x2 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            maxWidth: 1500,
          }}
        >
          {groups.map((g, gi) => {
            const delay = 12 + gi * 10;
            const groupProg = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={g.label}
                style={{
                  width: 680,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "20px 28px",
                  opacity: interpolate(groupProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(groupProg, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    marginBottom: 14,
                    letterSpacing: 1,
                  }}
                >
                  {g.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.deps.map((d, di) => {
                    const depDelay = delay + 6 + di * 4;
                    const depProg = spring({
                      frame: frame - depDelay,
                      fps,
                      config: { damping: 14, mass: 0.5 },
                    });
                    return (
                      <div
                        key={d.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 16px",
                          background: COLORS.bg,
                          borderRadius: 8,
                          border: `1px solid ${COLORS.border}`,
                          opacity: interpolate(depProg, [0, 1], [0, 1]),
                        }}
                      >
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 20,
                            fontWeight: 600,
                            color: COLORS.text,
                            whiteSpace: "pre",
                          }}
                        >
                          {d.name}
                        </div>
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 18,
                            color: COLORS.muted,
                            whiteSpace: "pre",
                          }}
                        >
                          {d.ver}
                        </div>
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
