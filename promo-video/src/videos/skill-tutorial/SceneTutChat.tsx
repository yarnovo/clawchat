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

const chatFlow = [
  { role: "user", text: "帮我装个 GitHub 技能", delay: 0 },
  { role: "agent", text: "正在安装 github...", delay: 20 },
  { role: "agent", text: "✅ 已安装 github v1.0.0", delay: 40 },
  { role: "agent", text: "现在我可以帮你操作 GitHub 了！", delay: 55 },
];

export const SceneTutChat: React.FC = () => {
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
          gap: 32,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          对话即安装
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: 700,
            padding: "28px 32px",
            borderRadius: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          {chatFlow.map((msg, i) => {
            const prog = spring({
              frame: frame - 10 - msg.delay,
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
                    fontFamily: isUser ? FONT_SANS : MONO,
                    fontSize: 26,
                    fontWeight: isUser ? 600 : 400,
                    color: isUser ? COLORS.white : COLORS.text,
                    padding: "14px 22px",
                    borderRadius: 14,
                    background: isUser ? COLORS.accent : "rgba(0,0,0,0.03)",
                    maxWidth: 500,
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
