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

export const SceneAmMoney: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const bigProg = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });
  const splitProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const noteProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          只收一种钱
        </div>

        {/* 大字使用费 */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 96,
            fontWeight: 700,
            color: COLORS.accent,
            transform: `scale(${bigProg})`,
          }}
        >
          使用费
        </div>

        {/* 分成图 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(splitProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(splitProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
              padding: "14px 24px",
              borderRadius: 12,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            用户付费
          </div>

          <div style={{ fontFamily: FONT_SANS, fontSize: 32, color: COLORS.accent, fontWeight: 700 }}>→</div>

          <div
            style={{
              display: "flex",
              gap: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.white,
                background: COLORS.accent,
                padding: "16px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div>平台</div>
              <div style={{ fontSize: 36 }}>20%</div>
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                background: COLORS.card,
                padding: "16px 36px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div>开发者</div>
              <div style={{ fontSize: 36, color: COLORS.accent }}>80%</div>
            </div>
          </div>
        </div>

        {/* 审核去重 */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 24,
            color: COLORS.muted,
            opacity: interpolate(noteProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteProg, [0, 1], [10, 0])}px)`,
          }}
        >
          审核去重 · fork 免费 · 上架免费
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
