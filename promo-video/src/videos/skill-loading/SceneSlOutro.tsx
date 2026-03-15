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

const rows = [
  {
    runtime: "NanoClaw",
    method: "SDK 自动注入",
    channel: ".claude/skills/",
    note: "绑定 Claude Code",
  },
  {
    runtime: "IronClaw",
    method: "独立通道 + XML",
    channel: "skill_context",
    note: "最精细控制",
  },
  {
    runtime: "OpenClaw",
    method: "拼进 system prompt",
    channel: "Project Context",
    note: "统一加载",
  },
  {
    runtime: "我们",
    method: "扫描 → 拼接",
    channel: "system prompt",
    note: "模型无关",
    highlight: true,
  },
];

const headers = ["Runtime", "注入方式", "通道", "特点"];

export const SceneSlOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const tableProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          技能加载方案对比
        </div>

        {/* Table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(tableProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tableProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              background: COLORS.text,
            }}
          >
            {headers.map((h) => (
              <div
                key={h}
                style={{
                  flex: 1,
                  padding: "14px 24px",
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.card,
                  textAlign: "center",
                  minWidth: 200,
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const delay = 20 + i * 10;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            const cells = [row.runtime, row.method, row.channel, row.note];
            return (
              <div
                key={row.runtime}
                style={{
                  display: "flex",
                  background: row.highlight
                    ? `linear-gradient(135deg, rgba(218, 119, 86, 0.06), rgba(218, 119, 86, 0.14))`
                    : i % 2 === 0
                      ? COLORS.card
                      : COLORS.bg,
                  borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [-20, 0])}px)`,
                }}
              >
                {cells.map((cell, ci) => (
                  <div
                    key={ci}
                    style={{
                      flex: 1,
                      padding: "16px 24px",
                      fontFamily: ci === 0 || ci === 2 ? MONO : FONT_SANS,
                      fontSize: 24,
                      fontWeight: row.highlight && ci === 0 ? 700 : ci === 0 ? 600 : 400,
                      color: row.highlight ? COLORS.accent : ci === 0 ? COLORS.text : COLORS.muted,
                      textAlign: "center",
                      minWidth: 200,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom badge */}
        {(() => {
          const badgeProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.card,
                background: COLORS.accent,
                padding: "12px 40px",
                borderRadius: 12,
                opacity: interpolate(badgeProg, [0, 1], [0, 1]),
                transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
              }}
            >
              不需要 SDK 绑定 · 不需要独立通道 · 任何模型都能用
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
