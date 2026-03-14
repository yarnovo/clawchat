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

const results = [
  { slug: "email-tool", name: "Email Tool", ver: "v1.0.2" },
  { slug: "himalaya", name: "Himalaya Mail", ver: "v1.0.0" },
  { slug: "gmail-agent", name: "Gmail Agent", ver: "v1.0.1" },
];

export const SceneTutSearch: React.FC = () => {
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
          搜索技能
        </div>

        {/* User query */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "14px 28px",
            borderRadius: 20,
            background: COLORS.accent,
            opacity: interpolate(
              spring({ frame: frame - 10, fps, config: { damping: 14 } }),
              [0, 1], [0, 1],
            ),
          }}
        >
          <div style={{ fontSize: 28 }}>💬</div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              fontWeight: 600,
              color: COLORS.white,
            }}
          >
            "搜一下邮件相关的技能"
          </div>
        </div>

        {/* Results */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 600,
          }}
        >
          {results.map((r, i) => {
            const delay = 25 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });

            return (
              <div
                key={r.slug}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {r.slug}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                    }}
                  >
                    {r.name}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.accent,
                  }}
                >
                  {r.ver}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
