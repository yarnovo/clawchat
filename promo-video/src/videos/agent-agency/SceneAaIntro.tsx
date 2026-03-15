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

export const SceneAaIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const compareProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
            fontSize: 72,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Agent 外包公司
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 36,
            color: COLORS.muted,
            letterSpacing: 6,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          不卖代码，卖服务
        </div>

        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 16,
            opacity: interpolate(compareProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(compareProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "24px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.muted }}>
              传统外包
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.subtle }}>
              交付代码
            </div>
          </div>

          <div
            style={{
              fontFamily: FONT,
              fontSize: 40,
              color: COLORS.subtle,
              alignSelf: "center",
            }}
          >
            vs
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "24px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.accent }}>
              我们
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text }}>
              交付在线 Agent
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
