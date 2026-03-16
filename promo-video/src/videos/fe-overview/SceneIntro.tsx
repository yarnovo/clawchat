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

const badges = [
  { label: "React 19", color: "#61DAFB" },
  { label: "Vite 8", color: "#646CFF" },
  { label: "Tailwind 4", color: "#38BDF8" },
  { label: "shadcn/ui", color: "#F97316" },
];

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title scale-in
  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  // Subtitle fade
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

  // "AI Chat App" label
  const labelProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -3,
            color: COLORS.text,
            transform: `scale(${titleScale})`,
          }}
        >
          ClawChat Frontend
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 34,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Full-stack TypeScript AI Chat Application
        </div>

        {/* Tech badges */}
        <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
          {badges.map((b, i) => {
            const delay = 25 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={b.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 28px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: b.color,
                  }}
                />
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Label */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "10px 32px",
            borderRadius: 8,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          React 19 + Vite 8 + Tailwind 4
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
