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

export const SceneAkemIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const fileProg = spring({ frame: frame - 15, fps, config: { damping: 12, mass: 0.8 } });
  const arrowProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const promptProg = spring({ frame: frame - 50, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Memory Extension
        </div>

        {/* File → Arrow → System Prompt row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {/* MEMORY.md file card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "32px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(fileProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(fileProg, [0, 1], [0.8, 1])})`,
            }}
          >
            {/* File icon */}
            <div
              style={{
                width: 80,
                height: 100,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent}44)`,
                border: `2px solid ${COLORS.accent}66`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                position: "relative",
              }}
            >
              {/* Fold corner */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 20,
                  height: 20,
                  background: COLORS.bg,
                  clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
                  backgroundColor: `${COLORS.accent}33`,
                }}
              />
              {/* Lines inside file */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 44 - i * 8,
                    height: 4,
                    borderRadius: 2,
                    background: `${COLORS.accent}88`,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              MEMORY.md
            </div>
          </div>

          {/* Arrow with label */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(arrowProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "6px 16px",
                borderRadius: 8,
                background: `${COLORS.accent}15`,
              }}
            >
              注入
            </div>
            {/* Arrow shape */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 80,
                  height: 4,
                  background: COLORS.accent,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "12px solid transparent",
                  borderBottom: "12px solid transparent",
                  borderLeft: `18px solid ${COLORS.accent}`,
                }}
              />
            </div>
          </div>

          {/* System Prompt card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "32px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(promptProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(promptProg, [0, 1], [0.8, 1])})`,
            }}
          >
            {/* Brain icon */}
            <div style={{ fontSize: 64 }}>🧠</div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              System Prompt
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          跨对话的持久知识
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
