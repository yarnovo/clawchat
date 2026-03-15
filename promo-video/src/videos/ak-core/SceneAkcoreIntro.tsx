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

/**
 * Scene 1: Big title "Core" + subtitle + cycling think->act diagram
 */
export const SceneAkcoreIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Animations --- */
  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subtitleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const diagramProg = spring({ frame: frame - 28, fps, config: { damping: 14, mass: 0.7 } });

  // Cycling arrow rotation (continuous)
  const arrowRotation = interpolate(frame, [0, 120], [0, 360], {
    extrapolateRight: "extend",
  });

  // Staggered labels
  const thinkProg = spring({ frame: frame - 36, fps, config: { damping: 14 } });
  const actProg = spring({ frame: frame - 46, fps, config: { damping: 14 } });
  const loopProg = spring({ frame: frame - 56, fps, config: { damping: 14 } });

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
        {/* Big title */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 120,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -4,
            transform: `scale(${titleScale})`,
          }}
        >
          Core
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 34,
            color: COLORS.muted,
            letterSpacing: 1,
            opacity: interpolate(subtitleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleProg, [0, 1], [20, 0])}px)`,
          }}
        >
          LLM + Tool + Prompt + While Loop
        </div>

        {/* Cycling diagram */}
        <div
          style={{
            marginTop: 32,
            opacity: interpolate(diagramProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(diagramProg, [0, 1], [0.8, 1])})`,
            display: "flex",
            alignItems: "center",
            gap: 0,
            position: "relative",
          }}
        >
          {/* Agent circle */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: `3px solid ${COLORS.border}`,
              background: COLORS.card,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              Agent
            </div>
          </div>

          {/* Orbit ring + labels */}
          <div
            style={{
              position: "absolute",
              width: 380,
              height: 380,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Spinning orbit ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `2px dashed ${COLORS.subtle}`,
                transform: `rotate(${arrowRotation}deg)`,
              }}
            >
              {/* Arrow indicator on the ring */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "8px solid transparent",
                  borderRight: "8px solid transparent",
                  borderBottom: `12px solid ${COLORS.accent}`,
                }}
              />
            </div>

            {/* Think label (top) */}
            <div
              style={{
                position: "absolute",
                top: -16,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: interpolate(thinkProg, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  fontWeight: 600,
                  color: COLORS.accent,
                  whiteSpace: "nowrap",
                }}
              >
                Think
              </div>
            </div>

            {/* Act label (bottom) */}
            <div
              style={{
                position: "absolute",
                bottom: -16,
                left: "50%",
                transform: "translateX(-50%)",
                opacity: interpolate(actProg, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
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
                Act
              </div>
            </div>

            {/* Loop label (right) */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                right: -60,
                transform: "translateY(-50%)",
                opacity: interpolate(loopProg, [0, 1], [0, 1]),
              }}
            >
              <div
                style={{
                  padding: "8px 20px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  fontFamily: MONO,
                  fontSize: 20,
                  fontWeight: 600,
                  color: COLORS.muted,
                  whiteSpace: "nowrap",
                }}
              >
                while(true)
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
