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

export const SceneSvPit5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const conflictProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const solutionProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 50,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          坑 5：多写冲突
        </div>

        {/* Conflict diagram */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            background: COLORS.card,
            borderRadius: 12,
            border: "1px solid rgba(220,80,60,0.3)",
            boxShadow: COLORS.cardShadow,
            padding: "24px 40px",
            opacity: interpolate(conflictProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(conflictProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 26,
              color: COLORS.text,
              textAlign: "center",
            }}
          >
            容器A 写
          </div>
          <div style={{ fontSize: 32, color: COLORS.muted }}>+</div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 26,
              color: COLORS.text,
              textAlign: "center",
            }}
          >
            容器B 写
          </div>
          <div style={{ fontSize: 32, color: COLORS.muted }}>→</div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 26,
              fontWeight: 600,
              color: "rgba(220,80,60,0.85)",
            }}
          >
            数据损坏
          </div>
        </div>

        {/* Solution */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "rgba(80,180,80,0.06)",
            borderRadius: 12,
            border: "1px solid rgba(80,180,80,0.3)",
            padding: "20px 36px",
            opacity: interpolate(solutionProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(solutionProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 32, flexShrink: 0 }}>💡</div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.text,
            }}
          >
            解决：一写多读 或 用数据库
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
