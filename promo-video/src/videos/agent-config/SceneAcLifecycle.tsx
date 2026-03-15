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

const mainFlow = ["created", "starting", "running", "stopped"];
const branches = [
  { from: "running", label: "error" },
  { from: "running", label: "exhausted" },
];

export const SceneAcLifecycle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 48,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          生命周期状态
        </div>

        {/* Main flow */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {mainFlow.map((state, i) => {
            const nodeProg = spring({
              frame: frame - 10 - i * 8,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            const isActive = state === "running";

            return (
              <div
                key={state}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(nodeProg, [0, 1], [0.8, 1])})`,
                }}
              >
                {/* Arrow before node (except first) */}
                {i > 0 && (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      color: COLORS.subtle,
                    }}
                  >
                    →
                  </div>
                )}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 30,
                    fontWeight: 700,
                    color: isActive ? COLORS.card : COLORS.text,
                    padding: "14px 28px",
                    borderRadius: 12,
                    background: isActive ? COLORS.accent : COLORS.card,
                    border: `1px solid ${isActive ? COLORS.accent : COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                  }}
                >
                  {state}
                </div>
              </div>
            );
          })}
        </div>

        {/* Branches */}
        <div style={{ display: "flex", gap: 40 }}>
          {branches.map((b, i) => {
            const branchProg = spring({
              frame: frame - 50 - i * 10,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={b.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: interpolate(branchProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(branchProg, [0, 1], [20, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                  }}
                >
                  {b.from}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.subtle,
                  }}
                >
                  →
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.accent,
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: "rgba(218,119,86,0.06)",
                    border: `1px dashed ${COLORS.accent}`,
                  }}
                >
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
