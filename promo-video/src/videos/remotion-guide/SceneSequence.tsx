import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const seqs = [
  { name: "Intro", from: 0, dur: 90, color: COLORS.accent },
  { name: "Demo", from: 90, dur: 120, color: "#B8860B" },
  { name: "Features", from: 210, dur: 150, color: COLORS.muted },
  { name: "Outro", from: 360, dur: 90, color: COLORS.accent },
];
const TOTAL = 450;

export const SceneSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, paddingBottom: 140, paddingLeft: 80, paddingRight: 80 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
        }}>
          时间轴编排
        </div>

        {/* Code */}
        {(() => {
          const cEnt = spring({ frame: frame - 10, fps, config: { damping: 14 } });
          return (
            <div style={{
              opacity: interpolate(cEnt, [0, 1], [0, 1]),
              background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
              padding: "20px 32px", boxShadow: COLORS.cardShadow, maxWidth: 1200, width: "100%",
            }}>
              <div style={{ fontFamily: MONO, fontSize: 22, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7 }}>
{`<Sequence from={0} durationInFrames={90}>    // 0-3s
  <Intro />
</Sequence>
<Sequence from={90} durationInFrames={120}>   // 3-7s
  <Demo />
</Sequence>
<Sequence from={210} durationInFrames={150}>  // 7-12s
  <Features />
</Sequence>`}
              </div>
            </div>
          );
        })()}

        {/* Visual timeline */}
        {(() => {
          const tEnt = spring({ frame: frame - 35, fps, config: { damping: 14 } });
          return (
            <div style={{
              opacity: interpolate(tEnt, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(tEnt, [0, 1], [20, 0])}px)`,
              width: "100%", maxWidth: 1200,
              background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
              padding: "24px 28px", boxShadow: COLORS.cardShadow,
            }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, marginBottom: 16 }}>时间轴可视化</div>

              {/* Timeline bar */}
              <div style={{ position: "relative", height: 50, background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                {seqs.map((s, i) => {
                  const left = (s.from / TOTAL) * 100;
                  const width = (s.dur / TOTAL) * 100;
                  const delay = 40 + i * 8;
                  const sEnt = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
                  return (
                    <div key={s.name} style={{
                      position: "absolute", left: `${left}%`, width: `${interpolate(sEnt, [0, 1], [0, width])}%`,
                      top: 4, bottom: 4, borderRadius: 6, background: `${s.color}30`, border: `2px solid ${s.color}`,
                      display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden",
                    }}>
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: s.color }}>{s.name}</div>
                    </div>
                  );
                })}
              </div>

              {/* Time labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {["0s", "3s", "7s", "12s", "15s"].map((t) => (
                  <div key={t} style={{ fontFamily: MONO, fontSize: 18, color: COLORS.subtle }}>{t}</div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Series note */}
        {(() => {
          const nEnt = spring({ frame: frame - 70, fps, config: { damping: 14 } });
          return (
            <div style={{
              opacity: interpolate(nEnt, [0, 1], [0, 1]),
              fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted,
              background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.accent}`,
              borderRadius: 8, padding: "14px 24px", maxWidth: 1200, width: "100%",
            }}>
              <span style={{ fontFamily: MONO, color: COLORS.accent, fontWeight: 700 }}>{"<Series>"}</span> 让多个片段自动首尾相接，无需手动计算 from 值
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
