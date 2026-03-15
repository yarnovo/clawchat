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

export const SceneChIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const diagramProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 45, fps, config: { damping: 12 } });

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
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Channel 层
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 与用户之间的桥梁
        </div>

        {/* Diagram: User <-> Channel <-> Agent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginTop: 20,
            opacity: interpolate(diagramProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(diagramProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* User side */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 36px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontSize: 56 }}>📱</div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              用户
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: COLORS.muted,
              }}
            >
              App / Web / IM
            </div>
          </div>

          {/* Arrow left */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              color: COLORS.accent,
              padding: "0 20px",
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            ←→
          </div>

          {/* Channel layer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              background: COLORS.accent,
              borderRadius: 16,
              padding: "24px 48px",
              boxShadow: "0 4px 24px rgba(218,119,86,0.2)",
            }}
          >
            <div style={{ fontSize: 56 }}>🔗</div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.white,
              }}
            >
              Channel
            </div>
          </div>

          {/* Arrow right */}
          <div
            style={{
              fontFamily: MONO,
              fontSize: 32,
              color: COLORS.accent,
              padding: "0 20px",
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            ←→
          </div>

          {/* Agent side */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "24px 36px",
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontSize: 56 }}>🤖</div>
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
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: COLORS.muted,
              }}
            >
              Docker 容器
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
