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

export const SceneDxHotreload: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const backendProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const frontendProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

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
          改代码，自动生效
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* 后端 */}
          <div
            style={{
              width: 540,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              opacity: interpolate(backendProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(backendProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: COLORS.accent }}>
              后端 · 自动重载
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text, padding: "12px 18px", borderRadius: 10, background: "#F5F0EB" }}>
              tsx watch src/index.ts
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, lineHeight: 1.6 }}>
              源码挂载到容器内
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, lineHeight: 1.6 }}>
              改文件 → 自动重编译 → 生效
            </div>
          </div>

          {/* 前端 */}
          <div
            style={{
              width: 540,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              opacity: interpolate(frontendProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(frontendProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 32, fontWeight: 600, color: COLORS.accent }}>
              前端 · make reload
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text, padding: "12px 18px", borderRadius: 10, background: "#F5F0EB" }}>
              flutter build web + nginx
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, lineHeight: 1.6 }}>
              重新构建 Web 产物
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, lineHeight: 1.6 }}>
              重启 nginx → 刷新浏览器
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
