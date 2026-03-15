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

const heartbeatLines = [
  { text: "## 每日简报", color: COLORS.text, weight: 700 },
  { text: "cron: 0 9 * * *", color: COLORS.accent, weight: 600 },
  { text: 'prompt: 生成今日新闻摘要', color: COLORS.muted, weight: 400 },
];

export const SceneAkcsDesign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 50, fps, config: { damping: 12 } });
  const reloadProg = spring({ frame: frame - 65, fps, config: { damping: 14 } });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          HEARTBEAT.md 配置
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {/* HEARTBEAT.md code card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: COLORS.cardShadow,
              minWidth: 420,
              opacity: interpolate(cardProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(cardProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            {/* File header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#FF5F56",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#FFBD2E",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "#27C93F",
                }}
              />
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 16,
                  color: COLORS.muted,
                  marginLeft: 12,
                }}
              >
                HEARTBEAT.md
              </div>
            </div>

            {/* Code lines */}
            {heartbeatLines.map((line, i) => {
              const lineProg = spring({
                frame: frame - 20 - i * 8,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: line.weight,
                    color: line.color,
                    lineHeight: 1.8,
                    opacity: interpolate(lineProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(lineProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {line.text}
                </div>
              );
            })}
          </div>

          {/* Arrow: fs.watch */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(arrowProg, [0, 1], [-10, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                fontWeight: 600,
                color: COLORS.accent,
              }}
            >
              fs.watch
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 40,
                color: COLORS.accent,
                lineHeight: 1,
              }}
            >
              →
            </div>
          </div>

          {/* Auto reload box */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              background: COLORS.accent,
              borderRadius: 16,
              padding: "28px 36px",
              boxShadow: "0 4px 24px rgba(218,119,86,0.2)",
              opacity: interpolate(reloadProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(reloadProg, [0, 1], [0.8, 1])})`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.white,
              }}
            >
              auto reload
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 20,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              格式错误静默跳过
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              → scheduler.log
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
