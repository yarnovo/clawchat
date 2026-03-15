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
const CENTER_Y = 420;

const eventSources = [
  {
    label: "HTTP 请求",
    icon: "🌐",
    fromX: 200,
    fromY: CENTER_Y,
    delay: 10,
  },
  {
    label: "定时触发",
    icon: "⏰",
    fromX: CENTER_X,
    fromY: 140,
    delay: 20,
  },
  {
    label: "用户消息",
    icon: "💬",
    fromX: 1720,
    fromY: CENTER_Y,
    delay: 30,
  },
];

export const SceneAkelSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerProg = spring({ frame, fps, config: { damping: 14, mass: 1.0 } });
  const badgeProg = spring({ frame: frame - 55, fps, config: { damping: 12, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ paddingBottom: 140 }}>
        {/* Central EventLoop label */}
        <div
          style={{
            position: "absolute",
            left: CENTER_X - 120,
            top: CENTER_Y - 45,
            width: 240,
            height: 90,
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
              fontSize: 30,
              fontWeight: 700,
              color: COLORS.white,
              letterSpacing: -0.5,
            }}
          >
            EventLoop
          </span>
        </div>

        {/* Event sources with arrows converging to center */}
        {eventSources.map((src, i) => {
          const prog = spring({
            frame: frame - src.delay,
            fps,
            config: { damping: 14, mass: 0.8 },
          });

          // Animate from source position toward center
          const currentX = interpolate(prog, [0, 1], [src.fromX, CENTER_X]);
          const currentY = interpolate(prog, [0, 1], [src.fromY, CENTER_Y]);

          // Label stays at source position
          const labelOpacity = interpolate(prog, [0, 0.3], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Arrow line from source to center
          const dx = CENTER_X - src.fromX;
          const dy = CENTER_Y - src.fromY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          const lineLength = interpolate(prog, [0, 1], [0, dist - 140], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div key={i}>
              {/* Source label */}
              <div
                style={{
                  position: "absolute",
                  left: src.fromX - 80,
                  top: src.fromY - (i === 1 ? 70 : 35),
                  width: 160,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity: labelOpacity,
                }}
              >
                <div style={{ fontSize: 40 }}>{src.icon}</div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.text,
                    whiteSpace: "nowrap",
                  }}
                >
                  {src.label}
                </div>
              </div>

              {/* Arrow line */}
              <div
                style={{
                  position: "absolute",
                  left: src.fromX,
                  top: src.fromY,
                  width: lineLength,
                  height: 3,
                  background: `linear-gradient(90deg, ${COLORS.subtle}, ${COLORS.accent})`,
                  transformOrigin: "0 50%",
                  transform: `rotate(${angle}deg)`,
                  borderRadius: 2,
                  opacity: interpolate(prog, [0, 0.2], [0, 0.6], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                }}
              />

              {/* Moving dot along the arrow */}
              <div
                style={{
                  position: "absolute",
                  left: currentX - 8,
                  top: currentY - 8,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  backgroundColor: COLORS.accent,
                  opacity: interpolate(prog, [0, 0.1, 0.9, 1], [0, 0.9, 0.9, 0], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  boxShadow: `0 0 10px ${COLORS.accent}60`,
                }}
              />
            </div>
          );
        })}

        {/* "零依赖" badge below center */}
        <div
          style={{
            position: "absolute",
            left: CENTER_X - 80,
            top: CENTER_Y + 70,
            width: 160,
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
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              零依赖
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
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
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
            统一的事件流，统一的处理方式
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
