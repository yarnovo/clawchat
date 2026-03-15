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

const pipeline = [
  { step: "1", label: "Markdown / 会话", desc: "源文件" },
  { step: "2", label: "切块 (400 tokens)", desc: "分块策略" },
  { step: "3", label: "嵌入向量", desc: "多提供商" },
  { step: "4", label: "SQLite + FTS5", desc: "混合索引" },
];

const weights = [
  { label: "向量相似度", value: "70%", color: COLORS.accent },
  { label: "BM25 全文", value: "30%", color: COLORS.muted },
];

const providers = ["OpenAI", "Gemini", "Voyage", "Mistral", "Ollama", "本地模型"];

export const SceneMemVector: React.FC = () => {
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
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 48 }}>🔍</div>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: COLORS.text }}>
            第三层：向量索引
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {pipeline.map((p, i) => {
            const delay = 10 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div key={p.step} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: "18px 24px",
                    borderRadius: 12,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    minWidth: 180,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: COLORS.accent }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 18, color: COLORS.muted }}>
                    {p.desc}
                  </div>
                </div>
                {i < pipeline.length - 1 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      color: COLORS.subtle,
                      opacity: interpolate(prog, [0, 1], [0, 1]),
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              opacity: interpolate(
                spring({ frame: frame - 50, fps, config: { damping: 14 } }),
                [0, 1], [0, 1],
              ),
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, letterSpacing: 2 }}>
              混合检索权重
            </div>
            {weights.map((w) => (
              <div key={w.label} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 160,
                    height: 24,
                    borderRadius: 12,
                    background: COLORS.border,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: w.value,
                      height: "100%",
                      borderRadius: 12,
                      background: w.color,
                    }}
                  />
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.text }}>
                  {w.label} {w.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              maxWidth: 500,
              opacity: interpolate(
                spring({ frame: frame - 60, fps, config: { damping: 14 } }),
                [0, 1], [0, 1],
              ),
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, letterSpacing: 2, width: "100%" }}>
              嵌入提供商
            </div>
            {providers.map((p) => (
              <div
                key={p}
                style={{
                  fontFamily: MONO,
                  fontSize: 18,
                  color: COLORS.accent,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
