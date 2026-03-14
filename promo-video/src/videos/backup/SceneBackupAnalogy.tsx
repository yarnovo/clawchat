import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { FONT } from "../../constants";

const analogies = [
  {
    icon: "🎮",
    title: "自动存档",
    desc: "每天凌晨 3 点\n系统自动保存进度",
    color: "#60a5fa",
  },
  {
    icon: "💾",
    title: "手动存档",
    desc: "每次部署前\nCI/CD 自动触发备份",
    color: "#a78bfa",
  },
  {
    icon: "🔄",
    title: "读档恢复",
    desc: "出事了？\n一行命令回到备份点",
    color: "#34d399",
  },
];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

export const SceneBackupAnalogy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0c1a", "#1a1e3e", "#0a0c1a"]} />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 50,
          paddingBottom: 120,
        }}
      >
        {/* 标题 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 800,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
            background:
              "linear-gradient(135deg, #ffffff 20%, #60a5fa 60%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          备份就像游戏存档
        </div>

        {/* 三张卡片 */}
        <div style={{ display: "flex", gap: 36 }}>
          {analogies.map((a, i) => {
            const delay = 20 + i * 22;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            const rgb = hexToRgb(a.color);
            const glow = interpolate(
              Math.sin(frame * 0.04 + i * 2),
              [-1, 1],
              [0.05, 0.15]
            );

            return (
              <div
                key={a.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  padding: "36px 32px",
                  background: `rgba(${rgb},0.04)`,
                  borderRadius: 24,
                  border: `1px solid rgba(${rgb},${glow + 0.1})`,
                  width: 300,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [60, 0])}px)`,
                  boxShadow: `0 8px 40px rgba(${rgb},${glow})`,
                }}
              >
                <div style={{ fontSize: 56 }}>{a.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 26,
                    fontWeight: 700,
                    color: a.color,
                  }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.6)",
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
