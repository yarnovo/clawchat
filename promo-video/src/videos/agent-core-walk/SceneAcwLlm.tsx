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

const params = [
  { key: "apiKey", desc: "模型密钥" },
  { key: "baseURL", desc: "端点地址" },
  { key: "model", desc: "模型名称" },
];

export const SceneAcwLlm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelProg = spring({ frame, fps, config: { damping: 14 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const interfaceProg = spring({ frame: frame - 18, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const implProg = spring({ frame: frame - 38, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            letterSpacing: 2,
            opacity: interpolate(labelProg, [0, 1], [0, 1]),
          }}
        >
          llm.ts + openai-provider.ts
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 42,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          模型抽象层
        </div>

        {/* Interface + Arrow + Implementation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* LLMProvider interface */}
          <div
            style={{
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              borderRadius: 16,
              boxShadow: COLORS.cardShadow,
              padding: "28px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(interfaceProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(interfaceProg, [0, 1], [-30, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>
              LLMProvider
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.muted }}>
              interface
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 26,
                color: COLORS.text,
                background: `rgba(218, 119, 86, 0.06)`,
                padding: "8px 16px",
                borderRadius: 8,
                marginTop: 4,
              }}
            >
              chat(messages, tools)
            </div>
          </div>

          {/* Arrow */}
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 48,
              color: COLORS.subtle,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            →
          </div>

          {/* OpenAIProvider implementation */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              boxShadow: COLORS.cardShadow,
              padding: "28px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(implProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(implProg, [0, 1], [30, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, color: COLORS.text }}>
              OpenAIProvider
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.muted }}>
              implements LLMProvider
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginTop: 4 }}>
              百炼 · DeepSeek · GPT
            </div>
          </div>
        </div>

        {/* Three params */}
        <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
          {params.map((p, i) => {
            const delay = 50 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={p.key}
                style={{
                  padding: "20px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 200,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                  {p.key}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {p.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
