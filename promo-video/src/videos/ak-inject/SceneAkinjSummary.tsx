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

const CENTER_X = 960;
const CENTER_Y = 380;

export const SceneAkinjSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerProg = spring({ frame, fps, config: { damping: 14, mass: 1.0 } });
  const wsProg = spring({ frame: frame - 15, fps, config: { damping: 14, mass: 0.8 } });
  const loopProg = spring({ frame: frame - 30, fps, config: { damping: 14, mass: 0.8 } });
  const badgeProg = spring({ frame: frame - 55, fps, config: { damping: 12, mass: 0.6 } });
  const tagProg = spring({ frame: frame - 70, fps, config: { damping: 14 } });

  // Animated dot flowing from WS → inject → loop
  const dotPhase = ((frame - 40) * 2) % 360;
  const dotT = Math.max(0, Math.min(1, dotPhase / 180));

  const wsBoxX = 240;
  const injectBoxX = CENTER_X;
  const loopBoxX = 1680;

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ paddingBottom: 140 }}>
        {/* Central inject() node */}
        <div
          style={{
            position: "absolute",
            left: injectBoxX - 110,
            top: CENTER_Y - 40,
            width: 220,
            height: 80,
            borderRadius: 20,
            background: COLORS.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 4px 24px ${COLORS.accent}40`,
            opacity: interpolate(centerProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(centerProg, [0, 1], [0.7, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.white,
            }}
          >
            .inject()
          </span>
        </div>

        {/* WebSocket source (left) */}
        <div
          style={{
            position: "absolute",
            left: wsBoxX - 100,
            top: CENTER_Y - 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(wsProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(wsProg, [0, 1], [-40, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 44 }}>🔌</div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            WebSocket
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              color: COLORS.muted,
            }}
          >
            用户新消息
          </div>
        </div>

        {/* Arrow: WS → inject */}
        <div
          style={{
            position: "absolute",
            left: wsBoxX + 100,
            top: CENTER_Y,
            width: interpolate(wsProg, [0, 1], [0, injectBoxX - wsBoxX - 210]),
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.subtle}, ${COLORS.accent})`,
            borderRadius: 2,
            opacity: interpolate(wsProg, [0, 1], [0, 0.7]),
          }}
        />

        {/* Agent loop (right) */}
        <div
          style={{
            position: "absolute",
            left: loopBoxX - 100,
            top: CENTER_Y - 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            opacity: interpolate(loopProg, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(loopProg, [0, 1], [40, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 44 }}>🔄</div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            Agent Loop
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 18,
              color: COLORS.muted,
            }}
          >
            工具调用循环
          </div>
        </div>

        {/* Arrow: inject → loop */}
        <div
          style={{
            position: "absolute",
            left: injectBoxX + 110,
            top: CENTER_Y,
            width: interpolate(loopProg, [0, 1], [0, loopBoxX - injectBoxX - 210]),
            height: 3,
            background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.subtle})`,
            borderRadius: 2,
            opacity: interpolate(loopProg, [0, 1], [0, 0.7]),
          }}
        />

        {/* Flowing dot */}
        {frame > 40 && (
          <div
            style={{
              position: "absolute",
              left: interpolate(dotT, [0, 0.5, 1], [wsBoxX + 100, injectBoxX, loopBoxX - 100]),
              top: CENTER_Y - 6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: COLORS.accent,
              boxShadow: `0 0 10px ${COLORS.accent}60`,
              opacity: 0.9,
            }}
          />
        )}

        {/* Badge: JS 单线程无竞态 */}
        <div
          style={{
            position: "absolute",
            left: CENTER_X - 120,
            top: CENTER_Y + 80,
            width: 240,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(badgeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "10px 28px",
              borderRadius: 24,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <span
              style={{
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              单线程无竞态
            </span>
          </div>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 180,
            display: "flex",
            justifyContent: "center",
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 26,
              color: COLORS.muted,
              letterSpacing: 1,
            }}
          >
            边跑边听，像 Claude Code 一样
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
