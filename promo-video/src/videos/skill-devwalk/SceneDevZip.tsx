import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT_SANS, MONO } from "../../constants";

export const SceneDevZip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const flowProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const detailProg = spring({ frame: frame - 35, fps, config: { damping: 14 } });

  const flow = [
    { label: "skill 目录", icon: "📁" },
    { label: "fflate 压缩", icon: "📦" },
    { label: "ZIP 响应", icon: "📤" },
  ];

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
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 48, fontWeight: 700, color: COLORS.accent }}>
            zip.ts
          </div>
          <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.muted }}>
            打包层
          </div>
        </div>

        {/* Flow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: interpolate(flowProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(flowProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {flow.map((f, i) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "28px 36px",
                  borderRadius: 14,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <div style={{ fontSize: 48 }}>{f.icon}</div>
                <div style={{ fontFamily: FONT_SANS, fontSize: 24, fontWeight: 600, color: COLORS.text }}>
                  {f.label}
                </div>
              </div>
              {i < flow.length - 1 && (
                <div style={{ fontFamily: FONT_SANS, fontSize: 36, color: COLORS.subtle }}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            opacity: interpolate(detailProg, [0, 1], [0, 1]),
          }}
        >
          {[
            "排除 _meta.json、隐藏文件",
            "实时打包，不预生成",
            "fflate 库：纯 JS，无 native 依赖",
          ].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: FONT_SANS,
                fontSize: 24,
                color: COLORS.muted,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ color: COLORS.accent, fontSize: 20 }}>●</div>
              {t}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
