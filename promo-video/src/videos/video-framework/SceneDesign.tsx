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

const palette = [
  { name: "bg", hex: "#FAF9F6", label: "奶油白" },
  { name: "text", hex: "#1A1A1A", label: "深棕" },
  { name: "muted", hex: "#8B7E74", label: "暖灰" },
  { name: "subtle", hex: "#C4B9AE", label: "淡灰" },
  { name: "accent", hex: "#DA7756", label: "Claude 橙" },
  { name: "border", hex: "#E8E0D8", label: "边框" },
  { name: "card", hex: "#FFFFFF", label: "卡片白" },
  { name: "shadow", hex: "rgba(0,0,0,0.06)", label: "极淡阴影" },
];

const fonts = [
  { var: "FONT", family: "Noto Serif SC", usage: "标题（衬线体）", sample: "法律合同审查助手" },
  { var: "FONT_SANS", family: "Noto Sans SC", usage: "正文 / 字幕", sample: "AI 守护每一份合同" },
  { var: "MONO", family: "JetBrains Mono", usage: "代码 / 数据", sample: "npm run render" },
];

export const SceneDesign: React.FC = () => {
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
          paddingLeft: 80,
          paddingRight: 80,
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
          Claude 视觉风格
        </div>

        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1500 }}>
          {/* Color palette */}
          <div
            style={{
              flex: 1,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle, marginBottom: 4 }}>
              8 色调色板
            </div>
            {palette.map((c, i) => {
              const delay = 12 + i * 5;
              const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
              return (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: c.hex,
                      border: `1px solid ${COLORS.border}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ fontFamily: MONO, fontSize: 18, color: COLORS.text, minWidth: 80 }}>
                    {c.hex.length <= 9 ? c.hex : "shadow"}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                    {c.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fonts */}
          <div
            style={{
              flex: 1.2,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle }}>
              3 套字体
            </div>
            {fonts.map((f, i) => {
              const delay = 20 + i * 12;
              const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
              return (
                <div
                  key={f.var}
                  style={{
                    background: COLORS.card,
                    borderRadius: 12,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    padding: "20px 24px",
                    opacity: interpolate(ent, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(ent, [0, 1], [20, 0])}px)`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: COLORS.accent }}>
                      {f.var}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.muted }}>
                      {f.usage}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: f.var === "MONO" ? MONO : f.var === "FONT" ? FONT : FONT_SANS,
                      fontSize: 28,
                      fontWeight: f.var === "FONT" ? 700 : 400,
                      color: COLORS.text,
                    }}
                  >
                    {f.sample}
                  </div>
                </div>
              );
            })}

            {/* Particles note */}
            {(() => {
              const pEnt = spring({ frame: frame - 55, fps, config: { damping: 14 } });
              return (
                <div
                  style={{
                    background: COLORS.bg,
                    borderRadius: 10,
                    border: `1px solid ${COLORS.border}`,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: interpolate(pEnt, [0, 1], [0, 1]),
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: `rgba(218,119,86,0.3)` }} />
                  <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.muted }}>
                    12 颗 Claude 橙微粒，缓慢漂浮
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
