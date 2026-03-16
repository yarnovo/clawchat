import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

export const SceneAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Demo animations
  const springVal = spring({ frame: frame - 20, fps, config: { damping: 12, mass: 0.8 } });
  const interpVal = interpolate(frame - 20, [0, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          动画双引擎
        </div>

        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1500 }}>
          {/* spring() */}
          {(() => {
            const ent = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div style={{
                flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                padding: "24px 28px", boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>spring()</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>物理弹性动画，自然过冲</div>
                <div style={{
                  fontFamily: MONO, fontSize: 20, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7,
                  background: COLORS.bg, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>
{`spring({
  frame,
  fps,
  config: {
    damping: 12,  // 阻尼
    mass: 0.8,    // 质量
    stiffness: 100 // 刚度
  }
}) // → 0...1（带过冲）`}
                </div>
                {/* Live demo bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>输出:</div>
                  <div style={{ flex: 1, height: 10, background: COLORS.bg, borderRadius: 5 }}>
                    <div style={{ height: "100%", width: `${springVal * 100}%`, background: COLORS.accent, borderRadius: 5 }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, minWidth: 50 }}>
                    {springVal.toFixed(2)}
                  </div>
                </div>
                {/* Demo circle */}
                <div style={{ display: "flex", justifyContent: "center", height: 60, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: COLORS.accent,
                    transform: `scale(${springVal})`,
                  }} />
                </div>
              </div>
            );
          })()}

          {/* interpolate() */}
          {(() => {
            const ent = spring({ frame: frame - 20, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div style={{
                flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
                padding: "24px 28px", boxShadow: COLORS.cardShadow,
                opacity: interpolate(ent, [0, 1], [0, 1]),
                display: "flex", flexDirection: "column", gap: 14,
              }}>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>interpolate()</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>线性数值映射，精确控制</div>
                <div style={{
                  fontFamily: MONO, fontSize: 20, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7,
                  background: COLORS.bg, padding: "12px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                }}>
{`interpolate(
  frame,
  [0, 60],       // 输入区间
  [0, 1],        // 输出区间
  {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  }
) // → 0...1（线性）`}
                </div>
                {/* Live demo bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>输出:</div>
                  <div style={{ flex: 1, height: 10, background: COLORS.bg, borderRadius: 5 }}>
                    <div style={{ height: "100%", width: `${interpVal * 100}%`, background: COLORS.accent, borderRadius: 5 }} />
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent, minWidth: 50 }}>
                    {interpVal.toFixed(2)}
                  </div>
                </div>
                {/* Demo box */}
                <div style={{ display: "flex", justifyContent: "center", height: 60, alignItems: "center" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 8, background: COLORS.accent,
                    opacity: interpVal,
                    transform: `translateX(${interpolate(interpVal, [0, 1], [-80, 80])}px)`,
                  }} />
                </div>
              </div>
            );
          })()}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
