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

const flowNodes = [
  "im-server",
  "agent-server",
  "\u8fd0\u884c\u65f6\u5bb9\u5668",
  "callback \u56de\u590d",
  "im-server",
];

export const SceneMsgAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent 消息转发
        </div>

        {/* Flow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {flowNodes.map((node, i) => {
            const nodeProg = spring({
              frame: frame - 10 - i * 10,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isFirst = i === 0;
            const isLast = i === flowNodes.length - 1;

            return (
              <div
                key={`${node}-${i}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(nodeProg, [0, 1], [20, 0])}px)`,
                }}
              >
                {/* Arrow (except before first node) */}
                {!isFirst && (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 32,
                      color: COLORS.subtle,
                      lineHeight: 1,
                      padding: "4px 0",
                    }}
                  >
                    ↓
                  </div>
                )}

                {/* Node box */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 600,
                    color: isFirst || isLast ? COLORS.accent : COLORS.text,
                    padding: "14px 36px",
                    borderRadius: 12,
                    background: COLORS.card,
                    border: `1px solid ${isFirst || isLast ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    minWidth: 280,
                    textAlign: "center",
                  }}
                >
                  {node}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
