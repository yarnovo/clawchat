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

export const SceneVsBackup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 22, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 40,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
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
          备份策略
        </div>

        {/* Two columns */}
        <div
          style={{
            display: "flex",
            gap: 48,
          }}
        >
          {/* Left column - DB backup */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: "32px 48px",
              background: COLORS.card,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              minWidth: 360,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(leftProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              数据库备份
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
              }}
            >
              身份 + 配置
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.accent,
                padding: "8px 16px",
                background: COLORS.bg,
                borderRadius: 8,
              }}
            >
              pg_dumpall
            </div>
          </div>

          {/* Right column - Volume backup */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              padding: "32px 48px",
              background: COLORS.card,
              borderRadius: 16,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              minWidth: 360,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(rightProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                fontWeight: 600,
                color: COLORS.text,
              }}
            >
              Volume 备份
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
              }}
            >
              运行时状态
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: COLORS.accent,
                padding: "8px 16px",
                background: COLORS.bg,
                borderRadius: 8,
              }}
            >
              docker cp
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
            marginTop: 8,
          }}
        >
          两者缺一不可，完整快照
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
