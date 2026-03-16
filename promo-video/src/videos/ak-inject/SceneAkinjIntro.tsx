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

const LOOP_CX = 960;
const LOOP_CY = 340;
const LOOP_R = 130;

export const SceneAkinjIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const titleProg = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const subProg = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  const loopProg = spring({ frame: frame - 30, fps, config: { damping: 16, mass: 1.2 } });
  const msgProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 70, fps, config: { damping: 12, mass: 0.6 } });

  // Rotating dot on the loop ring
  const angle = (frame * 3) * (Math.PI / 180);
  const dotX = LOOP_CX + Math.cos(angle) * LOOP_R;
  const dotY = LOOP_CY + Math.sin(angle) * LOOP_R;

  // Message bubble floating on the right, trying to get in
  const msgX = interpolate(arrowProg, [0, 1], [1650, 1350]);
  const msgBounce = Math.sin(frame * 0.15) * 6;

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 76,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -2,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `scale(${titleScale}) translateY(${interpolate(titleProg, [0, 1], [30, 0])}px)`,
          }}
        >
          Agent.inject()
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: 34,
            color: COLORS.muted,
            opacity: interpolate(subProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subProg, [0, 1], [20, 0])}px)`,
          }}
        >
          循环中的实时通信
        </div>
      </AbsoluteFill>

      {/* While loop ring */}
      <div
        style={{
          position: "absolute",
          left: LOOP_CX - LOOP_R - 4,
          top: LOOP_CY - LOOP_R - 4,
          width: (LOOP_R + 4) * 2,
          height: (LOOP_R + 4) * 2,
          borderRadius: "50%",
          border: `3px solid ${COLORS.border}`,
          opacity: interpolate(loopProg, [0, 1], [0, 0.7]),
          transform: `scale(${interpolate(loopProg, [0, 1], [0.5, 1])})`,
        }}
      />

      {/* Loop label */}
      <div
        style={{
          position: "absolute",
          left: LOOP_CX - 60,
          top: LOOP_CY - 16,
          fontFamily: MONO,
          fontSize: 22,
          color: COLORS.muted,
          opacity: interpolate(loopProg, [0, 1], [0, 0.8]),
          whiteSpace: "nowrap",
        }}
      >
        while loop
      </div>

      {/* Rotating dot on loop */}
      <div
        style={{
          position: "absolute",
          left: dotX - 8,
          top: dotY - 8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: COLORS.accent,
          boxShadow: `0 0 12px ${COLORS.accent}60`,
          opacity: interpolate(loopProg, [0, 1], [0, 1]),
        }}
      />

      {/* User message bubble */}
      <div
        style={{
          position: "absolute",
          left: msgX,
          top: LOOP_CY - 30 + msgBounce,
          opacity: interpolate(msgProg, [0, 1], [0, 1]),
        }}
      >
        <div
          style={{
            padding: "14px 24px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 28 }}>💬</span>
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 22,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            用户新消息
          </span>
        </div>

        {/* Arrow pointing left toward loop */}
        <div
          style={{
            position: "absolute",
            left: -40,
            top: 18,
            width: interpolate(arrowProg, [0, 1], [0, 30]),
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.subtle})`,
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
