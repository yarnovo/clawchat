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

export const SceneNcIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 42, fps, config: { damping: 14 } });

  const channels = ["WhatsApp", "Telegram", "Slack", "Discord"];

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 80,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: -2,
            transform: `scale(${logoProg})`,
          }}
        >
          NanoClaw
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 40,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          把 Claude Code 变成永远在线的私人助手
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
          随时随地 · 消息驱动 · 容器隔离
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            opacity: interpolate(tagsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagsProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {channels.map((ch) => (
            <div
              key={ch}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.accent,
                padding: "8px 22px",
                borderRadius: 8,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {ch}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
