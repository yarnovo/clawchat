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

const fileTree = [
  ".openclaw/workspace/",
  "├── MEMORY.md              → 长期索引",
  "├── memory/",
  "│   ├── 2026-03-10.md      → 每日笔记",
  "│   ├── 2026-03-12-api.md  → 自动摘要",
  "│   └── 2026-03-14-bug.md  → session 钩子",
];

const traits = [
  { icon: "👁", text: "人类可读的 Markdown" },
  { icon: "✏️", text: "可手动编辑和补充" },
  { icon: "🔄", text: "会话重置时自动保存" },
  { icon: "📅", text: "按日期 + slug 命名" },
];

export const SceneMemWorkspace: React.FC = () => {
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
          <div style={{ fontSize: 48 }}>📂</div>
          <div style={{ fontFamily: FONT, fontSize: 48, fontWeight: 700, color: COLORS.text }}>
            第二层：工作空间记忆
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "24px 32px",
              borderRadius: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            {fileTree.map((line, i) => {
              const delay = 10 + i * 6;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: i === 0 ? COLORS.accent : COLORS.text,
                    fontWeight: i === 0 ? 700 : 400,
                    whiteSpace: "pre",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {traits.map((t, i) => {
              const delay = 30 + i * 8;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={t.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 24px",
                    borderRadius: 10,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 28 }}>{t.icon}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.text }}>
                    {t.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
