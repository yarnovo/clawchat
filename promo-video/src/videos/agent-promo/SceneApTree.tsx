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

const children = [
  { icon: "🔍", name: "研究 Agent" },
  { icon: "✍️", name: "写作 Agent" },
  { icon: "📊", name: "数据 Agent" },
];

export const SceneApTree: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const rootProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });

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
          Agent 团队
        </div>

        {/* Tree structure */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
          }}
        >
          {/* Root node */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rootProg, [0, 1], [0, 1]),
              transform: `scale(${interpolate(rootProg, [0, 1], [0.8, 1])})`,
            }}
          >
            <div style={{ fontSize: 40 }}>🤖</div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              总管 Agent
            </div>
          </div>

          {/* Connector line */}
          <div
            style={{
              width: 3,
              height: 32,
              background: COLORS.border,
              opacity: interpolate(rootProg, [0, 1], [0, 1]),
            }}
          />

          {/* Horizontal line */}
          <div
            style={{
              width: 500,
              height: 3,
              background: COLORS.border,
              opacity: interpolate(rootProg, [0, 1], [0, 1]),
            }}
          />

          {/* Child nodes */}
          <div style={{ display: "flex", gap: 40, marginTop: 0 }}>
            {children.map((child, i) => {
              const delay = 25 + i * 10;
              const childProg = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.7 },
              });

              return (
                <div
                  key={child.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0,
                  }}
                >
                  {/* Vertical connector */}
                  <div
                    style={{
                      width: 3,
                      height: 24,
                      background: COLORS.border,
                      opacity: interpolate(childProg, [0, 1], [0, 1]),
                    }}
                  />
                  {/* Child card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "16px 28px",
                      borderRadius: 12,
                      background: COLORS.card,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      opacity: interpolate(childProg, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(childProg, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <div style={{ fontSize: 32 }}>{child.icon}</div>
                    <div
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      {child.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 28,
            color: COLORS.muted,
            opacity: interpolate(
              spring({ frame: frame - 50, fps, config: { damping: 14 } }),
              [0, 1],
              [0, 1],
            ),
            marginTop: 8,
          }}
        >
          自动拆解任务，分配执行
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
