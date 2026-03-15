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

const branches = [
  { label: "Prompt 注入", angle: -40 },
  { label: "Scripts 执行", angle: 0 },
  { label: "Hooks 拦截", angle: 40 },
];

export const SceneAkesIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const iconProg = spring({ frame: frame - 16, fps, config: { damping: 14, mass: 0.7 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Skills Extension
        </div>

        {/* SKILL.md icon + radiating branches */}
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: 700,
            height: 300,
          }}
        >
          {/* Center file icon */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${interpolate(iconProg, [0, 1], [0.6, 1])})`,
              opacity: interpolate(iconProg, [0, 1], [0, 1]),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              background: COLORS.card,
              border: `2px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 32px",
              boxShadow: COLORS.cardShadow,
              zIndex: 2,
            }}
          >
            {/* File icon shape */}
            <div
              style={{
                width: 48,
                height: 56,
                borderRadius: 6,
                border: `2px solid ${COLORS.accent}`,
                position: "relative",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Folded corner */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 14,
                  height: 14,
                  borderLeft: `1px solid ${COLORS.accent}`,
                  borderBottom: `1px solid ${COLORS.accent}`,
                  background: COLORS.bg,
                  borderRadius: "0 0 0 4px",
                }}
              />
              {/* Lines inside file */}
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    left: 8,
                    right: 12,
                    top: 18 + j * 10,
                    height: 3,
                    borderRadius: 1,
                    background: COLORS.subtle,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              SKILL.md
            </div>
          </div>

          {/* Radiating branches */}
          {branches.map((b, i) => {
            const delay = 30 + i * 12;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });

            // Calculate position based on angle
            const rad = (b.angle * Math.PI) / 180;
            const dist = 240;
            const x = Math.cos(rad) * dist;
            const y = Math.sin(rad) * dist * 0.6;

            return (
              <div key={b.label} style={{ position: "absolute", left: "50%", top: "50%" }}>
                {/* Line from center to label */}
                <svg
                  width="500"
                  height="300"
                  style={{
                    position: "absolute",
                    left: -250,
                    top: -150,
                    pointerEvents: "none",
                  }}
                >
                  <line
                    x1={250}
                    y1={150}
                    x2={250 + x}
                    y2={150 + y}
                    stroke={COLORS.subtle}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={interpolate(prog, [0, 1], [0, 0.6])}
                  />
                </svg>

                {/* Label card */}
                <div
                  style={{
                    position: "absolute",
                    left: x - 80,
                    top: y - 22,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 24px",
                      borderRadius: 12,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      fontWeight: 600,
                      color: COLORS.text,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
