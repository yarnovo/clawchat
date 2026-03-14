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

const installed = [
  { name: "github", ver: "1.0.0" },
  { name: "slack", ver: "1.0.0" },
  { name: "email-tool", ver: "1.0.2" },
  { name: "notion", ver: "1.0.0" },
];

export const SceneTutList: React.FC = () => {
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
          gap: 32,
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
          查看与更新
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            alignItems: "flex-start",
          }}
        >
          {/* Installed list */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              width: 400,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 24px",
                borderBottom: `1px solid ${COLORS.border}`,
                fontFamily: FONT_SANS,
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.muted,
                letterSpacing: 2,
              }}
            >
              已安装技能
            </div>
            {installed.map((s, i) => {
              const delay = 12 + i * 8;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "14px 24px",
                    background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text, fontWeight: 600 }}>
                    {s.name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 22, color: COLORS.accent }}>
                    v{s.ver}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Commands */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { cmd: "列出你的技能", icon: "📋" },
              { cmd: "更新所有技能", icon: "🔄" },
            ].map((c, i) => {
              const delay = 30 + i * 14;
              const prog = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.7 },
              });
              return (
                <div
                  key={c.cmd}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "18px 24px",
                    borderRadius: 14,
                    background: COLORS.accent,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <div style={{ fontSize: 28 }}>{c.icon}</div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: COLORS.white }}>
                    "{c.cmd}"
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
