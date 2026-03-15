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

const milestones = [
  { month: "1 个月", data: "业务数据" },
  { month: "3 个月", data: "客户画像" },
  { month: "6 个月", data: "沟通记忆" },
];

export const SceneAaMoat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const timelineProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const footerProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 64,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(titleProg, [0, 1], [0.9, 1])})`,
          }}
        >
          锁定效应
        </div>

        {/* 时间轴 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: interpolate(timelineProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(timelineProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {milestones.map((m, i) => {
            const itemDelay = 20 + i * 15;
            const itemProg = spring({ frame: frame - itemDelay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div key={m.month} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(itemProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(itemProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      background: COLORS.accent,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 700, color: COLORS.white }}>
                      {i + 1}
                    </div>
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.text }}>
                    {m.month}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      color: COLORS.accent,
                      padding: "8px 20px",
                      borderRadius: 10,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                    }}
                  >
                    {m.data}
                  </div>
                </div>
                {i < milestones.length - 1 && (
                  <div
                    style={{
                      width: 120,
                      height: 3,
                      background: COLORS.border,
                      margin: "0 16px",
                      marginBottom: 80,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.accent,
            opacity: interpolate(footerProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(footerProg, [0, 1], [20, 0])}px)`,
          }}
        >
          换掉你 = 从零开始
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
