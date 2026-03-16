import {
  AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS, MONO } from "../../constants";

const structure = [
  { name: "src/", indent: 0, desc: "" },
  { name: "  index.ts", indent: 1, desc: "registerRoot 入口" },
  { name: "  Root.tsx", indent: 1, desc: "注册所有 Composition" },
  { name: "  MyVideo.tsx", indent: 1, desc: "你的视频组件" },
  { name: "public/", indent: 0, desc: "静态资源（音频、图片）" },
  { name: "package.json", indent: 0, desc: "remotion CLI 脚本" },
];

export const SceneSetup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const cmdOp = interpolate(frame, [12, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cmdY = interpolate(frame, [12, 25], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 36, paddingBottom: 140, paddingLeft: 100, paddingRight: 100 }}>
        <div style={{
          fontFamily: FONT, fontSize: 56, fontWeight: 700, color: COLORS.text,
          opacity: interpolate(titleProg, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
        }}>
          一行命令，快速开始
        </div>

        {/* Command */}
        <div style={{
          opacity: cmdOp, transform: `translateY(${cmdY}px)`,
          background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
          padding: "20px 40px", boxShadow: COLORS.cardShadow,
        }}>
          <div style={{ fontFamily: MONO, fontSize: 30, color: COLORS.text }}>
            <span style={{ color: COLORS.accent }}>$</span> npx create-video@latest
          </div>
        </div>

        <div style={{ display: "flex", gap: 36, width: "100%", maxWidth: 1400 }}>
          {/* Project structure */}
          <div style={{
            flex: 1, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
            padding: "24px 28px", boxShadow: COLORS.cardShadow,
          }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, marginBottom: 14 }}>项目结构</div>
            {structure.map((s, i) => {
              const delay = 25 + i * 6;
              const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12, marginBottom: 6,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(ent, [0, 1], [-15, 0])}px)`,
                }}>
                  <div style={{ fontFamily: MONO, fontSize: 24, color: s.indent === 0 ? COLORS.accent : COLORS.text, whiteSpace: "pre" }}>
                    {s.name}
                  </div>
                  {s.desc && <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>— {s.desc}</div>}
                </div>
              );
            })}
          </div>

          {/* Root.tsx example */}
          <div style={{
            flex: 1.2, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12,
            padding: "24px 28px", boxShadow: COLORS.cardShadow,
          }}>
            <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle, marginBottom: 14 }}>Root.tsx</div>
            {(() => {
              const cEnt = spring({ frame: frame - 35, fps, config: { damping: 14 } });
              return (
                <div style={{
                  fontFamily: MONO, fontSize: 22, color: COLORS.text, whiteSpace: "pre", lineHeight: 1.7,
                  opacity: interpolate(cEnt, [0, 1], [0, 1]),
                }}>
{`export const RemotionRoot = () => (
  <>
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
)`}
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
