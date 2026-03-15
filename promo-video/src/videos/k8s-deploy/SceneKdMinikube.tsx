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

const pros = ["零成本", "一条命令安装"];
const cons = ["性能有限", "只是模拟环境"];

export const SceneKdMinikube: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const iconProg = spring({ frame: frame - 10, fps, config: { damping: 12, mass: 0.8 } });
  const listProg = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

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
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          minikube
        </div>

        {/* 笔记本图标 + 描述 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: interpolate(iconProg, [0, 1], [0, 1]),
            transform: `scale(${iconProg})`,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 20,
              background: COLORS.card,
              border: `2px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 52,
            }}
          >
            {"\uD83D\uDCBB"}
          </div>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.muted,
              lineHeight: 1.6,
            }}
          >
            <div>跑在本地笔记本上</div>
            <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.accent }}>
              minikube start
            </div>
          </div>
        </div>

        {/* 优缺点 */}
        <div
          style={{
            display: "flex",
            gap: 48,
            opacity: interpolate(listProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(listProg, [0, 1], [30, 0])}px)`,
          }}
        >
          <div
            style={{
              padding: "28px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: "#4CAF50" }}>
              优点
            </div>
            {pros.map((p) => (
              <div key={p} style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text }}>
                {"\u2713"} {p}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "28px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: "#E57373" }}>
              缺点
            </div>
            {cons.map((c) => (
              <div key={c} style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text }}>
                {"\u2717"} {c}
              </div>
            ))}
          </div>
        </div>

        {/* 标签 */}
        <div
          style={{
            padding: "10px 28px",
            borderRadius: 24,
            background: COLORS.border,
            fontFamily: FONT_SANS,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.muted,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
          }}
        >
          开发测试
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
