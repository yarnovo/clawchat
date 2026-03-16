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

const stats = [
  { value: "39.6K", label: "GitHub Stars" },
  { value: "900K", label: "npm 月下载" },
  { value: "300+", label: "贡献者" },
  { value: "52", label: "企业用户" },
  { value: "4,200", label: "依赖项目" },
  { value: "700+", label: "文档页面" },
];

export const SceneEcosystem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
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
          活跃的开源生态
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, justifyContent: "center", maxWidth: 1200 }}>
          {stats.map((s, i) => {
            const delay = 12 + i * 8;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "28px 36px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 220,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, color: COLORS.accent }}>
                  {s.value}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
