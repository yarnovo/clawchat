import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

export const SceneHooks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Live demo values
  const demoFrame = Math.min(frame, 150);
  const demoOpacity = Math.min(demoFrame / 60, 1).toFixed(2);
  const demoScale = Math.min(0.5 + demoFrame / 120, 1.5).toFixed(2);

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 32, paddingBottom: 140, paddingLeft: 80, paddingRight: 80 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
        }}>
          核心 Hooks
        </div>

        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1500 }}>
          {/* useCurrentFrame */}
          {(() => {
            const ent = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div style={{
                flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                padding: "24px 28px", boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(ent, [0, 1], [-30, 0])}px)`,
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>useCurrentFrame()</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>返回当前帧号（0-indexed）</div>
                <div style={{
                  fontFamily: MONO, fontSize: 22, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7,
                  background: COLORS.bg, padding: "14px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>
{`const frame = useCurrentFrame()
// frame = ${demoFrame}

const opacity = frame / 60
// opacity = ${demoOpacity}`}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>实时值:</div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>frame = {demoFrame}</div>
                </div>
              </div>
            );
          })()}

          {/* useVideoConfig */}
          {(() => {
            const ent = spring({ frame: frame - 20, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div style={{
                flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                padding: "24px 28px", boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(ent, [0, 1], [30, 0])}px)`,
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>useVideoConfig()</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>返回画布参数</div>
                <div style={{
                  fontFamily: MONO, fontSize: 22, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7,
                  background: COLORS.bg, padding: "14px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>
{`const { width, height,
        fps, durationInFrames }
  = useVideoConfig()

// { 1920, 1080, 30, 300 }`}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { k: "width", v: "1920" },
                    { k: "height", v: "1080" },
                    { k: "fps", v: "30" },
                    { k: "duration", v: "300" },
                  ].map((p) => (
                    <div key={p.k} style={{
                      fontFamily: MONO, fontSize: 20, padding: "6px 14px", borderRadius: 6,
                      border: `1px solid ${COLORS.border}`, background: COLORS.bg,
                    }}>
                      <span style={{ color: COLORS.muted }}>{p.k}: </span>
                      <span style={{ color: COLORS.accent, fontWeight: 700 }}>{p.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
