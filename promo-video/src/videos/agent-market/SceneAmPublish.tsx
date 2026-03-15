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

export const SceneAmPublish: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.6 } });
  const splitProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const reviewProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          上架变现
        </div>

        {/* 付费方式 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            opacity: interpolate(cardProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {["按对话次数", "按月订阅"].map((m) => (
            <div
              key={m}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 600,
                color: COLORS.text,
                padding: "16px 36px",
                borderRadius: 12,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              {m}
            </div>
          ))}
        </div>

        {/* 分成比例 */}
        <div
          style={{
            display: "flex",
            gap: 40,
            alignItems: "center",
            opacity: interpolate(splitProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(splitProg, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "20px 36px",
              borderRadius: 14,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: COLORS.muted }}>
              20%
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
              平台
            </div>
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>:</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "20px 36px",
              borderRadius: 14,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: COLORS.accent }}>
              80%
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.accent }}>
              你拿
            </div>
          </div>
        </div>

        {/* 平台审核去重 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 26,
            color: COLORS.muted,
            opacity: interpolate(reviewProg, [0, 1], [0, 1]),
            padding: "10px 28px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          平台审核去重 — 必须有实质差异化
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
