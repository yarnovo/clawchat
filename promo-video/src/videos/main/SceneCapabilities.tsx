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

const capabilities = [
  {
    icon: "🧠",
    title: "记忆",
    desc: "Agent 记住了什么？\n随时查看、随时管理",
  },
  {
    icon: "🔧",
    title: "MCP 技能",
    desc: "已安装的工具和服务\n一目了然",
  },
  {
    icon: "⏰",
    title: "定时任务",
    desc: "Agent 在忙什么？\n计划任务全掌控",
  },
  {
    icon: "📊",
    title: "实时状态",
    desc: "工具调用、运行日志\n透明可追溯",
  },
];

export const SceneCapabilities: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          透明可控的 AI 伙伴
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1400,
          }}
        >
          {capabilities.map((c, i) => {
            const delay = 20 + i * 18;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            const dir = i % 2 === 0 ? -1 : 1;

            return (
              <div
                key={c.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: 32,
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  width: 290,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [60 * dir, 0])}px) translateY(${interpolate(ent, [0, 1], [40, 0])}px)`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <div style={{ fontSize: 48 }}>{c.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}
                >
                  {c.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
