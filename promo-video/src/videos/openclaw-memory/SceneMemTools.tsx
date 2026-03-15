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

const tools = [
  {
    name: "memory_search",
    desc: "语义搜索，返回相关片段",
    params: "query, maxResults, minScore",
  },
  {
    name: "memory_store",
    desc: "主动保存，带重要性和分类",
    params: "text, importance, category",
  },
  {
    name: "memory_forget",
    desc: "按查询或 ID 删除，GDPR 合规",
    params: "query | memoryId",
  },
];

const categories = ["preference", "fact", "decision", "entity", "other"];

export const SceneMemTools: React.FC = () => {
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
          gap: 28,
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
          <div style={{ fontSize: 48 }}>🛠</div>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: COLORS.text }}>
            记忆工具
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 1000 }}>
          {tools.map((t, i) => {
            const delay = 10 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={t.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "20px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [50, 0])}px)`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: COLORS.accent, width: 260, flexShrink: 0 }}>
                  {t.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.text }}>
                    {t.desc}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 18, color: COLORS.muted }}>
                    ({t.params})
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            opacity: interpolate(
              spring({ frame: frame - 50, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, marginRight: 8 }}>
            分类标签
          </div>
          {categories.map((c) => (
            <div
              key={c}
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
              {c}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
