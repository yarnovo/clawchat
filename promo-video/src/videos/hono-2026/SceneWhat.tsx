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

const highlights = [
  { label: "核心体积", value: "14 KB" },
  { label: "基于", value: "Web Standards" },
  { label: "首次发布", value: "2022" },
  { label: "GitHub Stars", value: "25k+" },
];

export const SceneWhat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Code snippet fade-in
  const codeOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeY = interpolate(frame, [25, 40], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
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
          Hono = 炎 🔥
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32 }}>
          {highlights.map((h, i) => {
            const delay = 12 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={h.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "20px 28px",
                  background: COLORS.card,
                  borderRadius: 10,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 36, fontWeight: 700, color: COLORS.accent }}>
                  {h.value}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {h.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Code snippet */}
        <div
          style={{
            opacity: codeOpacity,
            transform: `translateY(${codeY}px)`,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: "28px 40px",
            boxShadow: COLORS.cardShadow,
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 26, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7 }}>
{`import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hello Hono!'))`}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
