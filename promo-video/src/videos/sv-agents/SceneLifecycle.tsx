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

const states = [
  { name: "created", color: COLORS.muted },
  { name: "starting", color: "#b08030" },
  { name: "running", color: "#22863a" },
  { name: "stopped", color: COLORS.subtle },
  { name: "deleted", color: "#cb2431" },
];

const transitions = [
  { from: 0, to: 1, label: "POST /start" },
  { from: 1, to: 2, label: "健康检查通过" },
  { from: 2, to: 3, label: "POST /stop" },
  { from: 3, to: 1, label: "POST /start" },
  { from: 3, to: 4, label: "DELETE" },
];

export const SceneLifecycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          生命周期状态机
        </div>

        {/* State nodes - horizontal flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
          }}
        >
          {states.map((st, i) => {
            const delay = 12 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div key={st.name} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div
                    style={{
                      opacity: interpolate(ent, [0, 1], [0, 1]),
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      padding: "0 8px",
                    }}
                  >
                    →
                  </div>
                )}
                <div
                  style={{
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(ent, [0, 1], [0.8, 1])})`,
                    padding: "16px 24px",
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `2px solid ${st.color}`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 700,
                      color: st.color,
                      whiteSpace: "pre",
                    }}
                  >
                    {st.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Transition labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 800,
          }}
        >
          {transitions.map((tr, i) => {
            const delay = 50 + i * 8;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-20, 0])}px)`,
                  padding: "10px 24px",
                  background: COLORS.card,
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: states[tr.from].color,
                    fontWeight: 600,
                    whiteSpace: "pre",
                  }}
                >
                  {states[tr.from].name}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>→</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: states[tr.to].color,
                    fontWeight: 600,
                    whiteSpace: "pre",
                  }}
                >
                  {states[tr.to].name}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 20,
                    color: COLORS.muted,
                    marginLeft: "auto",
                    whiteSpace: "pre",
                  }}
                >
                  {tr.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
