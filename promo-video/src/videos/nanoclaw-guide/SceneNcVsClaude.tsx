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

const claudeItems = [
  { label: "终端工具" },
  { label: "打开 / 关闭" },
  { label: "本地运行" },
  { label: "无消息渠道" },
];

const nanoItems = [
  { label: "常驻服务" },
  { label: "24 x 7 在线" },
  { label: "容器隔离" },
  { label: "多渠道接入" },
];

export const SceneNcVsClaude: React.FC = () => {
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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          Claude Code vs NanoClaw
        </div>

        <div style={{ display: "flex", gap: 40, alignItems: "stretch" }}>
          {/* Left: Claude Code */}
          <div
            style={{
              width: 480,
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
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 32,
                fontWeight: 600,
                color: COLORS.muted,
              }}
            >
              Claude Code
            </div>
            {claudeItems.map((item) => (
              <div
                key={item.label}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.muted,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "#F5F0EB",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>

          {/* Right: NanoClaw */}
          <div
            style={{
              width: 480,
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
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 32,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              NanoClaw
            </div>
            {nanoItems.map((item) => (
              <div
                key={item.label}
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 26,
                  color: COLORS.text,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "#F5F0EB",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
