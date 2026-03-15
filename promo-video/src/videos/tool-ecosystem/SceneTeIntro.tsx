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

const runtimes = [
  { name: "OpenClaw", philosophy: "生态", icon: "{...}" },
  { name: "IronClaw", philosophy: "安全", icon: "[==]" },
  { name: "NanoClaw", philosophy: "极简", icon: "/ /" },
];

export const SceneTeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          工具系统 · 三种哲学
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          工具是 Agent 的手
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 12,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {runtimes.map((r) => (
            <div
              key={r.name}
              style={{
                width: 280,
                padding: "32px 28px",
                borderRadius: 16,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 40,
                  color: COLORS.accent,
                }}
              >
                {r.icon}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.text,
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                }}
              >
                {r.philosophy}路线
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
