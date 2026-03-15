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

export const SceneK8sIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 30, fps, config: { damping: 12, mass: 0.8 } });
  const rightProg = spring({ frame: frame - 40, fps, config: { damping: 12, mass: 0.8 } });
  const questionProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
          K8s 是什么
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 32,
            color: COLORS.muted,
            letterSpacing: 4,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
          }}
        >
          管理一大堆容器的工具
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 80,
            marginTop: 20,
          }}
        >
          {/* 左边：一个容器 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `scale(${leftProg})`,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 20,
                background: COLORS.card,
                border: `2px solid ${COLORS.accent}`,
                boxShadow: COLORS.cardShadow,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: MONO,
                fontSize: 40,
                color: COLORS.accent,
              }}
            >
              {"{ }"}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
              1 个容器
            </div>
          </div>

          {/* 箭头 */}
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 48,
              color: COLORS.subtle,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
            }}
          >
            {"\u2192"}
          </div>

          {/* 右边：一大堆容器 + 问号 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `scale(${rightProg})`,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: 320, justifyContent: "center" }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 14,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {"{ }"}
                </div>
              ))}
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.accent,
                opacity: interpolate(questionProg, [0, 1], [0, 1]),
                transform: `scale(${questionProg})`,
              }}
            >
              {"?"}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
              100+ 个容器
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
