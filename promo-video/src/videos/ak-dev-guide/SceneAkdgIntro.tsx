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

const boxes = [
  { label: "Provider", color: COLORS.accent },
  { label: "AgentRunner", color: COLORS.text },
  { label: "Channel / Extension", color: COLORS.muted },
] as const;

/**
 * Scene 1: Title + horizontal diagram showing Provider -> AgentRunner <- Channel/Extension
 */
export const SceneAkdgIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Title --- */
  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });

  /* --- Subtitle --- */
  const subProg = spring({
    frame: frame - 16,
    fps,
    config: { damping: 14 },
  });

  /* --- Diagram boxes staggered --- */
  const boxProgs = boxes.map((_, i) =>
    spring({
      frame: frame - (30 + i * 12),
      fps,
      config: { damping: 14, mass: 0.7 },
    }),
  );

  /* --- Arrows between boxes --- */
  const arrowLeftProg = spring({
    frame: frame - 56,
    fps,
    config: { damping: 14 },
  });
  const arrowRightProg = spring({
    frame: frame - 64,
    fps,
    config: { damping: 14 },
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
          AgentKit 开发者指南
        </div>

        {/* Horizontal diagram: 3 boxes with arrows */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 12,
          }}
        >
          {boxes.map((box, i) => {
            const prog = boxProgs[i];

            return (
              <div
                key={box.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                }}
              >
                {/* Arrow before AgentRunner (right-pointing: Provider -> AgentRunner) */}
                {i === 1 && (
                  <svg
                    width="80"
                    height="40"
                    viewBox="0 0 80 40"
                    style={{
                      opacity: interpolate(arrowLeftProg, [0, 1], [0, 1]),
                      marginLeft: 12,
                      marginRight: 12,
                    }}
                  >
                    <line
                      x1="0"
                      y1="20"
                      x2="60"
                      y2="20"
                      stroke={COLORS.subtle}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <polygon
                      points="58,12 76,20 58,28"
                      fill={COLORS.subtle}
                    />
                  </svg>
                )}

                {/* Box */}
                <div
                  style={{
                    padding: "20px 32px",
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `2px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px) scale(${interpolate(prog, [0, 1], [0.92, 1])})`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: box.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {box.label}
                  </div>
                </div>

                {/* Arrow after AgentRunner (left-pointing: Channel/Extension -> AgentRunner) */}
                {i === 1 && (
                  <svg
                    width="80"
                    height="40"
                    viewBox="0 0 80 40"
                    style={{
                      opacity: interpolate(arrowRightProg, [0, 1], [0, 1]),
                      marginLeft: 12,
                      marginRight: 12,
                    }}
                  >
                    <line
                      x1="20"
                      y1="20"
                      x2="80"
                      y2="20"
                      stroke={COLORS.subtle}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                    <polygon
                      points="22,12 4,20 22,28"
                      fill={COLORS.subtle}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [16, 0])}px)`,
          }}
        >
          三个扩展点，完整覆盖
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
