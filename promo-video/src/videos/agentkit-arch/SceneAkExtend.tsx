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

const extensions = [
  {
    question: "接飞书?",
    action: "channels/ + feishu.ts",
    detail: "实现 Channel 接口",
  },
  {
    question: "加新工具?",
    action: "tools/ + tool.ts",
    detail: "导出 Tool",
  },
  {
    question: "加新技能?",
    action: "skills/ + SKILL.md",
    detail: "放入 Agent 工作区",
  },
];

export const SceneAkExtend: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const coreProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
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
          扩展方式
        </div>

        {/* Extension cards */}
        <div style={{ display: "flex", gap: 28 }}>
          {extensions.map((ext, i) => {
            const delay = 12 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={ext.question}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "28px 32px",
                  boxShadow: COLORS.cardShadow,
                  minWidth: 300,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {ext.question}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    fontWeight: 600,
                    color: COLORS.accent,
                    background: "rgba(218,119,86,0.08)",
                    padding: "10px 16px",
                    borderRadius: 8,
                  }}
                >
                  + {ext.action}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 20,
                    color: COLORS.muted,
                  }}
                >
                  {ext.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* Core unchanged badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: COLORS.accent,
            borderRadius: 12,
            padding: "14px 36px",
            boxShadow: "0 4px 20px rgba(218,119,86,0.2)",
            opacity: interpolate(coreProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(coreProg, [0, 1], [15, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            核心代码不用改
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
