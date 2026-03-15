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

const examples = ["Main 产品宣传", "Agent 核心卖点", "安全架构", "投资人 Pitch"];

export const SceneVgPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const verbProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const descProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 80,
          paddingBottom: 140,
        }}
      >
        {/* Left: number badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(numProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(numProg, [0, 1], [0.6, 1])})`,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: COLORS.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 64,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            1
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 40,
              fontWeight: 700,
              color: COLORS.text,
            }}
          >
            宣传
          </div>
        </div>

        {/* Right: content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 700,
          }}
        >
          {/* Hero verb */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 80,
              fontWeight: 700,
              color: COLORS.text,
              lineHeight: 1.1,
              opacity: interpolate(verbProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(verbProg, [0, 1], [40, 0])}px)`,
            }}
          >
            说服你选
          </div>

          {/* Desc */}
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 30,
              color: COLORS.muted,
              lineHeight: 1.6,
              opacity: interpolate(descProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(descProg, [0, 1], [20, 0])}px)`,
            }}
          >
            面向潜在用户和投资人，展示产品价值
          </div>

          {/* Example videos */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              opacity: interpolate(descProg, [0, 1], [0, 1]),
            }}
          >
            {examples.map((ex, i) => {
              const tagProg = spring({
                frame: frame - 30 - i * 5,
                fps,
                config: { damping: 14 },
              });
              return (
                <div
                  key={ex}
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.accent,
                    padding: "6px 16px",
                    borderRadius: 8,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  }}
                >
                  {ex}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
