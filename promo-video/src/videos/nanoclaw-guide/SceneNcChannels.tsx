import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

const channels = ["WhatsApp", "Telegram", "Discord", "Slack", "Gmail"];

// Layout: center hub + 5 channels in a semi-arc
const channelPositions = [
  { x: -380, y: -100 },
  { x: -200, y: -200 },
  { x: 0, y: -240 },
  { x: 200, y: -200 },
  { x: 380, y: -100 },
];

export const SceneNcChannels: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hubProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const linesProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const cmdProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 140,
        }}
      >
        {/* Connection lines */}
        <svg
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {channelPositions.map((pos, i) => {
            const lineLen = interpolate(linesProg, [0, 1], [0, 1]);
            const cx = 960;
            const cy = 460;
            const tx = cx + pos.x;
            const ty = cy + pos.y;
            const ex = cx + (tx - cx) * lineLen;
            const ey = cy + (ty - cy) * lineLen;
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={ex}
                y2={ey}
                stroke={COLORS.border}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            );
          })}
        </svg>

        {/* Center hub */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${hubProg})`,
            marginTop: -80,
            fontFamily: MONO,
            fontSize: 36,
            fontWeight: 700,
            color: COLORS.accent,
            padding: "18px 36px",
            borderRadius: 16,
            background: COLORS.card,
            border: `2px solid ${COLORS.accent}`,
            boxShadow: COLORS.cardShadow,
            zIndex: 2,
          }}
        >
          NanoClaw
        </div>

        {/* Channel cards */}
        {channels.map((ch, i) => {
          const delay = 18 + i * 6;
          const prog = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14 },
          });
          const pos = channelPositions[i];
          return (
            <div
              key={ch}
              style={{
                position: "absolute",
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px - 80px)`,
                transform: `translate(-50%, -50%) scale(${prog})`,
                fontFamily: FONT_SANS,
                fontSize: 24,
                fontWeight: 600,
                color: COLORS.text,
                padding: "14px 28px",
                borderRadius: 12,
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
                zIndex: 2,
              }}
            >
              {ch}
            </div>
          );
        })}

        {/* Bottom command */}
        <div
          style={{
            position: "absolute",
            bottom: 180,
            left: "50%",
            fontFamily: MONO,
            fontSize: 28,
            color: "#D4D4D4",
            padding: "14px 32px",
            borderRadius: 12,
            background: "#1E1E1E",
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(cmdProg, [0, 1], [0, 1]),
            transform: `translateX(-50%) translateY(${interpolate(cmdProg, [0, 1], [20, 0])}px)`,
          }}
        >
          <span style={{ color: "#DA7756" }}>$ </span>/add-whatsapp
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
