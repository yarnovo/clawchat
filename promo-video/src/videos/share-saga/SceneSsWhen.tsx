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

const useItems = ["跨服务操作", "步骤可补偿", "不需强一致性"];
const dontItems = ["单服务用 DB 事务", "需要强一致性", "用两阶段提交"];

export const SceneSsWhen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });

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
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          适用场景
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* 该用 Saga */}
          <div
            style={{
              width: 420,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.accent,
                marginBottom: 24,
              }}
            >
              ✅ 该用 Saga
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {useItems.map((item) => (
                <div
                  key={item}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.text,
                    paddingLeft: 16,
                    borderLeft: `3px solid ${COLORS.accent}`,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* 不该用 */}
          <div
            style={{
              width: 420,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.muted,
                marginBottom: 24,
              }}
            >
              ⛔ 不该用
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {dontItems.map((item) => (
                <div
                  key={item}
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.muted,
                    paddingLeft: 16,
                    borderLeft: `3px solid ${COLORS.border}`,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
