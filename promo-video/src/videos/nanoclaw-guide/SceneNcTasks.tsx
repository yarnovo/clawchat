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

const tasks = [
  {
    title: "每日新闻简报",
    schedule: "每天早上 9:00",
    desc: "从 Hacker News 抓取新闻，生成简报推送",
  },
  {
    title: "每周 README 检查",
    schedule: "每周五 18:00",
    desc: "检查代码仓库，自动更新 README",
  },
];

const flowSteps = ["自然语言", "cron", "容器执行", "消息推送"];

export const SceneNcTasks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
          定时任务
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {tasks.map((t, i) => {
            const delay = 12 + i * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14 },
            });
            return (
              <div
                key={t.title}
                style={{
                  width: 460,
                  padding: "28px 32px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {t.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.accent,
                  }}
                >
                  {t.schedule}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {t.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Flow steps */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 8,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {flowSteps.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.text,
                  padding: "8px 20px",
                  borderRadius: 8,
                  background: "#F5F0EB",
                }}
              >
                {step}
              </div>
              {i < flowSteps.length - 1 && (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.subtle,
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
