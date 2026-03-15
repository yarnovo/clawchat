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

const plans = [
  {
    num: "1",
    title: "完整打包",
    desc: "tar -czf backup.tar.gz .openclaw/",
    detail: "包含会话、Markdown、SQLite 索引",
    tag: "完整恢复",
  },
  {
    num: "2",
    title: "精准备份",
    desc: "cp -r workspace/memory/ backup/",
    detail: "只备份长期知识，体积小、跨版本",
    tag: "推荐",
  },
  {
    num: "3",
    title: "迁移导出",
    desc: "读取索引文本 → memory_store API",
    detail: "跨实例迁移，写入新 Agent",
    tag: "高级",
  },
];

export const SceneMemBackup: React.FC = () => {
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
          <div style={{ fontSize: 48 }}>💾</div>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: COLORS.text }}>
            备份方案
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: 1000 }}>
          {plans.map((p, i) => {
            const delay = 10 + i * 14;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const isRecommended = p.tag === "推荐";
            return (
              <div
                key={p.num}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `2px solid ${isRecommended ? COLORS.accent : COLORS.border}`,
                  boxShadow: isRecommended ? "0 4px 24px rgba(218,119,86,0.15)" : COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [60, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 36,
                    fontWeight: 800,
                    color: isRecommended ? COLORS.accent : COLORS.subtle,
                    width: 50,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {p.num}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                      {p.title}
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 14,
                        color: isRecommended ? COLORS.card : COLORS.muted,
                        background: isRecommended ? COLORS.accent : COLORS.border,
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {p.tag}
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 18, color: COLORS.accent }}>{p.desc}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>{p.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
