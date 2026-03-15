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

export const SceneAkchIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 12, mass: 0.8 } });
  const arrowProg = spring({ frame: frame - 28, fps, config: { damping: 16, mass: 1 } });
  const rightProg = spring({ frame: frame - 18, fps, config: { damping: 12, mass: 0.8 } });
  const labelProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          HTTP Channel
        </div>

        {/* Icons row: Browser/App <-> Agent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {/* Left: Browser/App */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(leftProg, [0, 1], [0.7, 1])})`,
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 24,
                background: COLORS.card,
                border: `2px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 64,
              }}
            >
              🌐
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.muted,
              }}
            >
              外部应用
            </div>
          </div>

          {/* Arrow with label */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            {/* Top arrow (request) */}
            <svg width="260" height="28" viewBox="0 0 260 28">
              <defs>
                <marker id="arrowRight" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
                  <path d="M0,0 L10,4 L0,8" fill={COLORS.accent} />
                </marker>
                <marker id="arrowLeft" markerWidth="10" markerHeight="8" refX="1" refY="4" orient="auto">
                  <path d="M10,0 L0,4 L10,8" fill={COLORS.accent} />
                </marker>
              </defs>
              <line
                x1="10"
                y1="10"
                x2={interpolate(arrowProg, [0, 1], [10, 250])}
                y2="10"
                stroke={COLORS.accent}
                strokeWidth="3"
                markerEnd="url(#arrowRight)"
              />
              <line
                x1={interpolate(arrowProg, [0, 1], [250, 10])}
                y1="22"
                x2="250"
                y2="22"
                stroke={COLORS.subtle}
                strokeWidth="3"
                strokeDasharray="8,6"
                markerStart="url(#arrowLeft)"
              />
            </svg>

            {/* REST API label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "6px 20px",
                borderRadius: 8,
                background: `${COLORS.accent}15`,
                border: `1px solid ${COLORS.accent}30`,
                opacity: interpolate(labelProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(labelProg, [0, 1], [10, 0])}px)`,
              }}
            >
              REST API
            </div>
          </div>

          {/* Right: Agent */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(rightProg, [0, 1], [0.7, 1])})`,
            }}
          >
            <div
              style={{
                width: 140,
                height: 140,
                borderRadius: 24,
                background: COLORS.accent,
                boxShadow: "0 4px 24px rgba(218,119,86,0.25)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 64,
              }}
            >
              🤖
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              Agent
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
