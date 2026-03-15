import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const categories = [
  { name: "文件操作", count: 4, items: "Read / Write / Edit / Glob" },
  { name: "运行时", count: 2, items: "Bash / Shell" },
  { name: "网络", count: 2, items: "WebSearch / WebFetch" },
  { name: "记忆", count: 2, items: "Memory / Note" },
  { name: "会话管理", count: 6, items: "Session / Fork / Switch / List / Archive / Resume" },
  { name: "浏览器", count: 2, items: "BrowserAction / BrowserNavigate" },
  { name: "媒体", count: 2, items: "TextToSpeech / Canvas" },
  { name: "自动化", count: 2, items: "Cron / Webhook" },
];

export const SceneTcOpenclaw: React.FC = () => {
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
          gap: 16,
          paddingBottom: 140,
          paddingTop: 30,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            marginBottom: 8,
          }}
        >
          <span style={{ color: COLORS.accent }}>OpenClaw</span> · 23 个工具
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 1200 }}>
          {categories.map((cat, i) => {
            const delay = 8 + i * 6;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={cat.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "12px 24px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  {cat.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 700,
                    color: COLORS.text,
                    width: 36,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {cat.count}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {cat.items}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
