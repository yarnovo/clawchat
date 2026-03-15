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

const dbItems = [
  { label: "操作日志", icon: "LOG" },
  { label: "工具执行", icon: "TOOL" },
  { label: "会话记录", icon: "CHAT" },
];

const searchMethods = [
  { name: "FTS", desc: "全文检索" },
  { name: "Vector", desc: "向量搜索" },
  { name: "RRF", desc: "融合排序" },
];

export const SceneSmIronclaw: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const dbProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const searchProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
          IronClaw · 数据库驱动
        </div>

        {/* DB storage targets */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(dbProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(dbProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "20px 32px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
              PostgreSQL
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>/</div>
            <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
              libSQL
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 32, color: COLORS.subtle }}>
              &larr;
            </div>
          </div>

          {dbItems.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "20px 24px",
                borderRadius: 14,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: COLORS.accent }}>
                {item.icon}
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.text }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Hybrid search */}
        <div
          style={{
            padding: "28px 40px",
            borderRadius: 16,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(searchProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(searchProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.text }}>
            Workspace 混合搜索
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {searchMethods.map((m, i) => (
              <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                    {m.name}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                    {m.desc}
                  </div>
                </div>
                {i < searchMethods.length - 1 && (
                  <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.subtle }}>+</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
          }}
        >
          重启不丢数据 · 可审计回溯
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
