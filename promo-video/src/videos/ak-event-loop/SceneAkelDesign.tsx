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

const DOT_COLORS = ["#DA7756", "#5B8DEF", "#E8A838", "#6DC5A1", "#9B7DD4"];

export const SceneAkelDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  const strategies = [
    {
      label: "逐个处理",
      sublabel: "Sequential",
      delay: 15,
      render: (prog: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[0, 1, 2, 3, 4].map((j) => {
            const isActive = j === 1;
            return (
              <div
                key={j}
                style={{
                  width: isActive ? 28 : 22,
                  height: isActive ? 28 : 22,
                  borderRadius: "50%",
                  backgroundColor: isActive ? COLORS.accent : DOT_COLORS[j % DOT_COLORS.length],
                  opacity: isActive ? 1 : 0.4,
                  boxShadow: isActive ? `0 0 16px ${COLORS.accent}60` : "none",
                  transform: isActive ? "scale(1.2)" : "scale(1)",
                }}
              />
            );
          })}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              color: COLORS.muted,
              marginLeft: 8,
            }}
          >
            → one by one
          </div>
        </div>
      ),
    },
    {
      label: "合并处理",
      sublabel: "Batch",
      delay: 30,
      render: (prog: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 12,
              border: `2px solid ${COLORS.accent}`,
              background: `${COLORS.accent}10`,
            }}
          >
            {[0, 1, 2].map((j) => (
              <div
                key={j}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: DOT_COLORS[j],
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              color: COLORS.muted,
            }}
          >
            → merged batch
          </div>
        </div>
      ),
    },
    {
      label: "优先级排序",
      sublabel: "Priority",
      delay: 45,
      render: (prog: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {[1, 2, 3].map((num, j) => (
            <div
              key={j}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: j === 0 ? COLORS.accent : DOT_COLORS[j + 1],
                opacity: j === 0 ? 1 : 0.6,
                boxShadow: j === 0 ? `0 0 12px ${COLORS.accent}50` : "none",
              }}
            >
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.white,
                }}
              >
                {num}
              </span>
            </div>
          ))}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              color: COLORS.muted,
              marginLeft: 4,
            }}
          >
            → sorted
          </div>
        </div>
      ),
    },
  ];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
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
          三种调度策略
        </div>

        {/* Strategy cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {strategies.map((s, i) => {
            const prog = spring({
              frame: frame - s.delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "24px 36px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  minWidth: 700,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Label */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 18,
                      color: COLORS.muted,
                    }}
                  >
                    {s.sublabel}
                  </div>
                </div>

                {/* Separator */}
                <div
                  style={{
                    width: 1.5,
                    height: 48,
                    background: COLORS.border,
                  }}
                />

                {/* Visual */}
                {s.render(prog)}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
