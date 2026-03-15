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

const userSide = ["零门槛拥有 Agent", "不装环境不懂技术", "像用微信一样简单"];
const supplySide = ["流量入口", "分成激励", "开发者生态"];

export const SceneIpValue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const centerProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const columnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "32px 28px",
    borderRadius: 16,
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    boxShadow: COLORS.cardShadow,
    width: 340,
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
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          双边市场
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {/* User Side */}
          <div
            style={{
              ...columnStyle,
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
                marginBottom: 8,
              }}
            >
              用户侧
            </div>
            {userSide.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.muted,
                  lineHeight: 1.6,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Platform Center */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              alignSelf: "center",
              opacity: interpolate(centerProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(centerProg, [0, 1], [0.6, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              平台
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.accent,
                padding: "14px 24px",
                borderRadius: 12,
                background: COLORS.card,
                border: `2px solid ${COLORS.accent}`,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              连接 + 流量 + 支付
            </div>
          </div>

          {/* Supply Side */}
          <div
            style={{
              ...columnStyle,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 8,
              }}
            >
              供给侧
            </div>
            {supplySide.map((item) => (
              <div
                key={item}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 22,
                  color: COLORS.muted,
                  lineHeight: 1.6,
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
