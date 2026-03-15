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

const traits = [
  { label: "节点", value: "3+ 台机器", icon: "\uD83D\uDDA5\uFE0F" },
  { label: "高可用", value: "自动故障转移", icon: "\u21C4" },
  { label: "规模", value: "千级用户+", icon: "\u2191" },
];

export const SceneKdK8s: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
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
          gap: 36,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          完整 K8s 集群
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          搭建复杂，运维成本高，但能力最强
        </div>

        {/* 3 台机器图标 */}
        <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => {
            const prog = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 12, mass: 0.8 } });
            return (
              <div
                key={i}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 56,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `scale(${prog})`,
                }}
              >
                {"\uD83D\uDDA5\uFE0F"}
              </div>
            );
          })}
        </div>

        {/* 特性行 */}
        <div style={{ display: "flex", gap: 32 }}>
          {traits.map((t, i) => {
            const prog = spring({ frame: frame - 38 - i * 8, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={t.label}
                style={{
                  padding: "20px 28px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                <div style={{ fontSize: 36, lineHeight: 1 }}>{t.icon}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
                  {t.label}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {t.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* 标签 */}
        <div
          style={{
            padding: "10px 28px",
            borderRadius: 24,
            background: COLORS.border,
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          规模化
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
