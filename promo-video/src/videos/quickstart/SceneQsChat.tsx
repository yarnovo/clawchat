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

const messages = [
  { role: "user", text: "你好，介绍一下你自己", delay: 0 },
  { role: "agent", text: "你好！我是你的AI助手，很高兴为你服务。你可以问我任何问题，我会尽力帮助你。", delay: 20 },
];

export const SceneQsChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });

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
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: 4,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(labelProg, [0, 1], [20, 0])}px)`,
          }}
        >
          STEP 4
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          开始对话
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: 700,
            marginTop: 8,
          }}
        >
          {messages.map((msg, i) => {
            const prog = spring({
              frame: frame - 18 - msg.delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isUser = msg.role === "user";

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 500,
                    color: COLORS.text,
                    padding: "18px 26px",
                    borderRadius: 16,
                    background: isUser
                      ? "rgba(0,0,0,0.04)"
                      : COLORS.card,
                    border: isUser
                      ? "none"
                      : `1px solid ${COLORS.border}`,
                    boxShadow: isUser ? "none" : COLORS.cardShadow,
                    maxWidth: 520,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
