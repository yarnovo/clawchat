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

const categories = [
  { name: "文件操作", count: 6, items: "Bash / Read / Write / Edit / Glob / Grep" },
  { name: "网络", count: 2, items: "WebSearch / WebFetch" },
  { name: "任务", count: 3, items: "TaskCreate / TaskUpdate / TaskList" },
  { name: "团队", count: 3, items: "TeamCreate / TeamDelete / SendMessage" },
  { name: "其他", count: 4, items: "Cron / Notebook / Skill / EnterWorktree" },
];

export const SceneTcNanoclaw: React.FC = () => {
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
          gap: 18,
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
          <span style={{ color: "#5B8DEF" }}>NanoClaw</span> · 19 个工具
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 1200 }}>
          {categories.map((cat, i) => {
            const delay = 8 + i * 7;
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
                  padding: "14px 24px",
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
                    color: "#5B8DEF",
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

          {/* MCP 扩展特殊卡片 */}
          {(() => {
            const delay = 8 + categories.length * 7;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #5B8DEF15, #5B8DEF08)",
                  border: `2px dashed #5B8DEF60`,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: "#5B8DEF",
                    width: 120,
                    flexShrink: 0,
                  }}
                >
                  MCP 扩展
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#5B8DEF",
                    width: 36,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  +N
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  接入任意 MCP Server，工具数量无上限
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
