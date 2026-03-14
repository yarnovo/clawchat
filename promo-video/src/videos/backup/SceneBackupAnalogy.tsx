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

const analogies = [
  {
    icon: "🎮",
    title: "自动存档",
    desc: "每天凌晨 3 点\n系统自动保存进度",
  },
  {
    icon: "💾",
    title: "手动存档",
    desc: "每次部署前\nCI/CD 自动触发备份",
  },
  {
    icon: "🔄",
    title: "读档恢复",
    desc: "出事了？\n一行命令回到备份点",
  },
];

export const SceneBackupAnalogy: React.FC = () => {
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
        {/* Title */}
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
          备份就像游戏存档
        </div>

        {/* Three cards */}
        <div style={{ display: "flex", gap: 36 }}>
          {analogies.map((a, i) => {
            const delay = 20 + i * 22;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });

            return (
              <div
                key={a.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 32px",
                  background: "#fff",
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  width: 300,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [60, 0])}px)`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <div style={{ fontSize: 48 }}>{a.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {a.title}
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
                  {a.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
