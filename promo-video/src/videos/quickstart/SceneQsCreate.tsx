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

const fields = [
  { label: "名称", value: "我的助手", icon: "📝" },
  { label: "模型", value: "Claude / GPT-4o / Ollama", icon: "🤖" },
  { label: "API Key", value: "sk-xxxxx", icon: "🔑" },
  { label: "系统提示词", value: "你是一个友好的助手...", icon: "💬" },
];

export const SceneQsCreate: React.FC = () => {
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
          STEP 2
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
          创建 Agent
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 16,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            width: 600,
            overflow: "hidden",
            marginTop: 8,
          }}
        >
          {fields.map((field, i) => {
            const delay = 18 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={field.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 28px",
                  borderBottom: i < fields.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [15, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 28 }}>{field.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.text,
                    width: 120,
                  }}
                >
                  {field.label}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.muted,
                  }}
                >
                  {field.value}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
