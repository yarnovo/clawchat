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

const imageLayers = [
  { name: "CLAUDE.md", desc: "人格文件", color: "#DA7756" },
  { name: "Skills", desc: "预装技能", color: "#6BBF6A" },
  { name: "Tools", desc: "预装工具", color: "#5B8DEF" },
  { name: "agent-core", desc: "引擎", color: "#9B7FCB" },
];

export const SceneTaContainer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const layersProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const forkProg = spring({ frame: frame - 45, fps, config: { damping: 14 } });

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
          容器 = Agent
        </div>

        <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>
          {/* Docker 镜像分层图 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column-reverse",
              gap: 0,
              opacity: interpolate(layersProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(layersProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 600,
                color: COLORS.muted,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Docker Image
            </div>
            {imageLayers.map((l, i) => {
              const lDelay = 18 + i * 8;
              const lProg = spring({ frame: frame - lDelay, fps, config: { damping: 14, mass: 0.5 } });
              return (
                <div
                  key={l.name}
                  style={{
                    width: 420,
                    padding: "16px 24px",
                    background: COLORS.card,
                    borderLeft: `4px solid ${l.color}`,
                    borderTop: i === imageLayers.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    borderRight: `1px solid ${COLORS.border}`,
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: interpolate(lProg, [0, 1], [0, 1]),
                    transform: `translateY(${interpolate(lProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                    {l.name}
                  </span>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                    {l.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* fork = commit + run */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              alignItems: "center",
              opacity: interpolate(forkProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(forkProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 8,
              }}
            >
              fork 流程
            </div>
            {[
              { step: "docker commit", desc: "保存当前状态" },
              { step: "docker run", desc: "启动新实例" },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  padding: "20px 32px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  width: 340,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                  {s.step}
                </div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
