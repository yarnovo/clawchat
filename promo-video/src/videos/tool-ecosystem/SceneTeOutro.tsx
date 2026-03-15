import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const recommendations = [
  { need: "丰富生态", runtime: "OpenClaw", desc: "npm 生态 + ClawHub 分发" },
  { need: "安全隔离", runtime: "IronClaw", desc: "WASM 沙箱 + MCP 协议" },
  { need: "极简定制", runtime: "NanoClaw", desc: "直接改源码 + Skills 生态" },
];

export const SceneTeOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
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
          场景决定选择
        </div>

        <div
          style={{
            display: "flex",
            gap: 32,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {recommendations.map((r) => (
            <div
              key={r.runtime}
              style={{
                width: 320,
                padding: "28px 28px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                }}
              >
                {r.need}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 34,
                  fontWeight: 700,
                  color: COLORS.accent,
                }}
              >
                {r.runtime}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                  textAlign: "center",
                }}
              >
                {r.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          未来通过 MCP 协议逐步打通
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
