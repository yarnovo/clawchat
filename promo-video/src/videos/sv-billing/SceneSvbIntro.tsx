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

const usageTypes = [
  { icon: "\uD83D\uDCAC", label: "Chat", desc: "聊天消息", metric: "每次对话计一条" },
  { icon: "\uD83E\uDDE0", label: "Token", desc: "Token 消耗", metric: "按 input/output 统计" },
  { icon: "\uD83E\uDDE9", label: "Skill Install", desc: "技能安装", metric: "每次安装计一条" },
];

export const SceneSvbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 84,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Billing & Usage
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 300,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Agent 用量追踪
        </div>

        {/* 3 usage type cards */}
        <div style={{ display: "flex", gap: 36 }}>
          {usageTypes.map((ut, i) => {
            const delay = 22 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, mass: 0.6 },
            });
            return (
              <div
                key={ut.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 18,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 20,
                  padding: "36px 44px",
                  minWidth: 300,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 52 }}>{ut.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.accent,
                  }}
                >
                  {ut.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: COLORS.text,
                  }}
                >
                  {ut.desc}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 18,
                    color: COLORS.muted,
                  }}
                >
                  {ut.metric}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
