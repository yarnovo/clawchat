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
  "安装：2 小时+",
  "配置：反复折腾",
  "卸载：叫人上门",
  "维护：噩梦",
];

const rightItems = [
  "注册：3 分钟",
  "创建 Agent：10 秒",
  "删除：一键搞定",
  "维护：零",
];

export const ScenePpCompare: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const rightProg = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14 },
  });
  const footProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: 420,
    padding: "36px 32px",
    borderRadius: 16,
    background: COLORS.card,
    boxShadow: COLORS.cardShadow,
  };

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
            transform: `translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          对比
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* Left card - self-host */}
          <div
            style={{
              ...cardStyle,
              border: `1px solid ${COLORS.border}`,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              自己搭 OpenClaw
            </div>
            {leftItems.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.muted,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Right card - ClawChat */}
          <div
            style={{
              ...cardStyle,
              border: `2px solid ${COLORS.accent}`,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.accent,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              用 ClawChat
            </div>
            {rightItems.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 24,
                  color: COLORS.text,
                  fontWeight: 500,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.accent,
            opacity: interpolate(footProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(footProg, [0, 1], [0.8, 1])})`,
          }}
        >
          门槛从满级降到零级
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
