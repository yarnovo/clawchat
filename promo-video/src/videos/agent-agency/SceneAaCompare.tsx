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

const leftItems = [
  "交付结束",
  "客户自运维",
  "每次从零开发",
  "一次性收费",
];

const rightItems = [
  "持续运行",
  "远程维护",
  "模板复用",
  "按月收费",
];

export const SceneAaCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          两种模式对比
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* 左侧：传统外包 */}
          <div
            style={{
              width: 500,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: COLORS.muted }}>
              传统外包
            </div>
            {leftItems.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: COLORS.subtle,
                  lineHeight: 1.6,
                  paddingLeft: 16,
                  borderLeft: `3px solid ${COLORS.border}`,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* 右侧：Agent 外包 */}
          <div
            style={{
              width: 500,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: COLORS.accent }}>
              Agent 外包
            </div>
            {rightItems.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: COLORS.text,
                  lineHeight: 1.6,
                  paddingLeft: 16,
                  borderLeft: `3px solid ${COLORS.accent}`,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
