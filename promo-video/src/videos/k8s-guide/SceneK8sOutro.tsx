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

export const SceneK8sOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const analogyProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const listProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

  const progressions = [
    "1 个 Pod",
    "自动扩缩容",
    "监控 + 日志",
  ];

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
          渐进式工具
        </div>

        {/* git 类比 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            opacity: interpolate(analogyProg, [0, 1], [0, 1]),
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 30, color: COLORS.accent }}>git</span>
          <span>{"\u2014"}</span>
          <span>先学三个命令就能用</span>
        </div>

        {/* 渐进步骤 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(listProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(listProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {progressions.map((p, i) => (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  padding: "20px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                {p}
              </div>
              {i < progressions.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 32, color: COLORS.subtle }}>
                  {"\u2192"}
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 30,
            color: COLORS.muted,
            textAlign: "center",
            lineHeight: 1.8,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
          }}
        >
          K8s 不是大工程，是慢慢长大的基础设施
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
