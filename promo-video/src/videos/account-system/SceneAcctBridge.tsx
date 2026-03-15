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

export const SceneAcctBridge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const centerProg = spring({ frame: frame - 25, fps, config: { damping: 12, mass: 0.8 } });
  const rightProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const lineProg = spring({ frame: frame - 20, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 60,
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
          accountId 跨服务桥梁
        </div>

        {/* Bridge diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {/* Left: im-server */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "32px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              im-server
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
              }}
            >
              Account 身份
            </div>
          </div>

          {/* Connector line left */}
          <div
            style={{
              width: 60,
              height: 2,
              background: COLORS.border,
              opacity: interpolate(lineProg, [0, 1], [0, 1]),
            }}
          />

          {/* Center: accountId */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "28px 48px",
              borderRadius: 16,
              background: "rgba(218,119,86,0.06)",
              border: `2px solid ${COLORS.accent}`,
              opacity: interpolate(centerProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(centerProg, [0, 1], [0.8, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 40,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              accountId
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                color: COLORS.muted,
              }}
            >
              一个身份，两套服务
            </div>
          </div>

          {/* Connector line right */}
          <div
            style={{
              width: 60,
              height: 2,
              background: COLORS.border,
              opacity: interpolate(lineProg, [0, 1], [0, 1]),
            }}
          />

          {/* Right: agent-server */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              padding: "32px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: 32,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              agent-server
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
              }}
            >
              Agent 配置
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
