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

export const SceneConcept: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Animated frame counter
  const demoFrame = Math.min(frame - 20, 90);

  const codeOp = interpolate(frame, [12, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const codeY = interpolate(frame, [12, 25], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const outputOp = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ball animation driven by frame
  const ballX = demoFrame > 0 ? interpolate(demoFrame, [0, 90], [0, 300], { extrapolateRight: "clamp" }) : 0;
  const ballY = demoFrame > 0 ? Math.sin((demoFrame / 90) * Math.PI * 3) * -40 : 0;

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
          paddingLeft: 80,
          paddingRight: 80,
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
          核心概念：帧 → 组件 → 画面
        </div>

        <div style={{ display: "flex", gap: 40, width: "100%", maxWidth: 1500, alignItems: "stretch" }}>
          {/* Left: Code */}
          <div
            style={{
              flex: 1,
              opacity: codeOp,
              transform: `translateY(${codeY}px)`,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: "24px 28px",
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>React 组件</div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7 }}>
{`const MyVideo = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = frame / fps

  return (
    <div style={{ opacity }}>
      Hello, Remotion!
    </div>
  )
}`}
            </div>
          </div>

          {/* Right: Visual output */}
          <div
            style={{
              flex: 0.8,
              opacity: outputOp,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>渲染输出</div>

            {/* Mini preview */}
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: 28,
                height: 200,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Bouncing ball demo */}
              <div
                style={{
                  position: "absolute",
                  left: 40 + ballX,
                  bottom: 60 + ballY,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: COLORS.accent,
                }}
              />
              {/* Ground line */}
              <div
                style={{
                  position: "absolute",
                  bottom: 50,
                  left: 28,
                  right: 28,
                  height: 1,
                  background: COLORS.border,
                }}
              />
            </div>

            {/* Frame counter */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted }}>当前帧</div>
              <div style={{ fontFamily: MONO, fontSize: 32, fontWeight: 700, color: COLORS.accent }}>
                {Math.max(0, demoFrame)}
              </div>
            </div>

            {/* Key insight */}
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.muted,
                background: COLORS.bg,
                border: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${COLORS.accent}`,
                borderRadius: 8,
                padding: "12px 18px",
                lineHeight: 1.5,
              }}
            >
              帧号变化 → 组件重新渲染 → 动画产生
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
