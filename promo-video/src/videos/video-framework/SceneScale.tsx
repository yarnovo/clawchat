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

const categories = [
  { name: "Promo", count: 10, desc: "产品宣传" },
  { name: "Tutorial", count: 5, desc: "使用教程" },
  { name: "Educational", count: 35, desc: "技术科普" },
  { name: "Developer", count: 20, desc: "开发者向" },
  { name: "Startup", count: 10, desc: "创业相关" },
  { name: "Walkthrough", count: 5, desc: "代码走读" },
];

export const SceneScale: React.FC = () => {
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
          gap: 40,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          六大分类，统一管理
        </div>

        {/* Category grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center", maxWidth: 1300 }}>
          {categories.map((c, i) => {
            const delay = 15 + i * 10;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });

            // Bar width proportional to count
            const barWidth = (c.count / 35) * 100;

            return (
              <div
                key={c.name}
                style={{
                  width: 380,
                  padding: "20px 28px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [20, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 600, color: COLORS.text }}>
                      {c.name}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                      {c.desc}
                    </div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, color: COLORS.accent }}>
                    {c.count}
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, background: COLORS.bg, borderRadius: 3 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${interpolate(ent, [0, 1], [0, barWidth])}%`,
                      background: COLORS.accent,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        {(() => {
          const totEnt = spring({ frame: frame - 75, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                display: "flex",
                gap: 32,
                opacity: interpolate(totEnt, [0, 1], [0, 1]),
              }}
            >
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.text }}>
                总计 <span style={{ fontFamily: MONO, fontWeight: 700, color: COLORS.accent }}>85</span> 个视频
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
                音频 <span style={{ fontFamily: MONO, fontWeight: 700 }}>36 MB</span>
              </div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
                一个 <span style={{ fontFamily: MONO, fontWeight: 700 }}>Studio</span> 统一管理
              </div>
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
