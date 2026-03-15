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

const openclawTags = ["灵活开放", "最小约束", "信任优先"];
const ironclawTags = ["纵深防御", "零信任", "逐层隔离"];

export const SceneSfIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const vsProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          安全模型对比
        </div>

        <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
          {/* OpenClaw */}
          <div
            style={{
              width: 440,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              alignItems: "center",
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-50, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              OpenClaw
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {openclawTags.map((tag, i) => {
                const tagProg = spring({ frame: frame - 25 - i * 6, fps, config: { damping: 14 } });
                return (
                  <div
                    key={tag}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      opacity: interpolate(tagProg, [0, 1], [0, 1]),
                    }}
                  >
                    {tag}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 40,
              fontWeight: 700,
              color: COLORS.accent,
              opacity: interpolate(vsProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(vsProg, [0, 1], [0.5, 1])})`,
            }}
          >
            VS
          </div>

          {/* IronClaw */}
          <div
            style={{
              width: 440,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              alignItems: "center",
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [50, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              IronClaw
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {ironclawTags.map((tag, i) => {
                const tagProg = spring({ frame: frame - 25 - i * 6, fps, config: { damping: 14 } });
                return (
                  <div
                    key={tag}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      color: COLORS.muted,
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      opacity: interpolate(tagProg, [0, 1], [0, 1]),
                    }}
                  >
                    {tag}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
