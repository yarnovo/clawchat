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

export const SceneAtSafety: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const riskProg = spring({ frame: frame - 14, fps, config: { damping: 14 } });
  const govProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          安全与治理
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "28px 40px",
            borderRadius: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(riskProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(riskProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>风险演进</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, color: COLORS.muted, textDecoration: "line-through" }}>
              简单幻觉
            </div>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>→</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>新威胁</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>
              系统性欺骗
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "28px 40px",
            borderRadius: 14,
            background: COLORS.card,
            border: `1px solid ${COLORS.accent}40`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(govProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(govProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>治理转变</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, color: COLORS.muted, textDecoration: "line-through" }}>
              合规负担
            </div>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>→</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>新定位</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 700, color: COLORS.accent }}>
              部署加速器
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
