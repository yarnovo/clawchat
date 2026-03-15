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

const features = [
  { label: "单台 ECS", value: "生产就绪" },
  { label: "内存占用", value: "500MB" },
  { label: "安装方式", value: "一条命令" },
  { label: "扩容", value: "加节点零改动" },
];

export const SceneKdK3s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const iconProg = spring({ frame: frame - 18, fps, config: { damping: 12, mass: 0.8 } });
  const cmdProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 60,
              fontWeight: 700,
              color: COLORS.accent,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
            }}
          >
            k3s
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              background: COLORS.accent,
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.white,
              opacity: interpolate(badgeProg, [0, 1], [0, 1]),
              transform: `scale(${badgeProg})`,
            }}
          >
            推荐
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
          }}
        >
          Rancher 出品 · 轻量 K8s · 单个二进制文件
        </div>

        {/* ECS 图标 + 特性列表 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 20,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 56,
              opacity: interpolate(iconProg, [0, 1], [0, 1]),
              transform: `scale(${iconProg})`,
            }}
          >
            {"\uD83D\uDDA5\uFE0F"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {features.map((f, i) => {
              const prog = spring({ frame: frame - 22 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, width: 140 }}>
                    {f.label}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 700, color: COLORS.text }}>
                    {f.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 安装命令 */}
        <div
          style={{
            padding: "14px 32px",
            borderRadius: 12,
            background: "#1A1A1A",
            fontFamily: MONO,
            fontSize: 24,
            color: "#4ADE80",
            opacity: interpolate(cmdProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cmdProg, [0, 1], [20, 0])}px)`,
          }}
        >
          curl -sfL https://get.k3s.io | sh -
        </div>

        {/* 标签 */}
        <div
          style={{
            padding: "10px 28px",
            borderRadius: 24,
            background: COLORS.accent,
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.white,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          生产推荐
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
