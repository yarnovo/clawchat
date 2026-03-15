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

const chatLines = [
  { role: "user", text: "把触发词从 Andy 改成 Bob" },
  { role: "agent", text: "已将 src/config.ts 中的触发词从 Andy 改为 Bob，并重启服务。" },
];

export const SceneNcCustomize: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const chatProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const replyProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 32,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          改代码，不改配置
        </div>

        {/* Chat conversation */}
        <div
          style={{
            width: 800,
            padding: "28px 36px",
            borderRadius: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* User message */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              opacity: interpolate(chatProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(chatProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.card,
                padding: "14px 22px",
                borderRadius: 14,
                background: COLORS.accent,
                maxWidth: 500,
              }}
            >
              {chatLines[0].text}
            </div>
          </div>

          {/* Agent reply */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              opacity: interpolate(replyProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(replyProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                color: COLORS.text,
                padding: "14px 22px",
                borderRadius: 14,
                background: "#F5F0EB",
                maxWidth: 560,
                lineHeight: 1.5,
              }}
            >
              {chatLines[1].text}
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 26,
              color: COLORS.accent,
              padding: "10px 24px",
              borderRadius: 8,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            35K tokens
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
              padding: "10px 24px",
              borderRadius: 8,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            完全可理解
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
