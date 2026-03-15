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

const capabilities = [
  { role: "客服", desc: "7×24 自动响应" },
  { role: "营销", desc: "内容生成 + 投放" },
  { role: "开发", desc: "代码生成 + 部署" },
  { role: "财务", desc: "账单 + 报表自动化" },
];

export const SceneBizSolo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 12, fps, config: { damping: 14, mass: 0.8 } });
  const dataProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 28,
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          效率维度 · 一人公司
        </div>

        <div
          style={{
            display: "flex",
            gap: 48,
            alignItems: "center",
            opacity: interpolate(leftProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(leftProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* 左侧：一个人 + Agent */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              padding: "28px 40px",
              borderRadius: 16,
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              boxShadow: COLORS.cardShadow,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 56, color: COLORS.text }}>
              1 人
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 28, color: COLORS.accent }}>
              + Agent
            </div>
          </div>

          {/* 箭头 */}
          <div style={{ fontFamily: FONT_SANS, fontSize: 48, color: COLORS.subtle }}>
            =
          </div>

          {/* 右侧：团队级能力 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {capabilities.map((c, i) => {
              const delay = 20 + i * 8;
              const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  key={c.role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "12px 24px",
                    borderRadius: 10,
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.cardShadow,
                    opacity: interpolate(prog, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.accent,
                      width: 80,
                    }}
                  >
                    {c.role}
                  </span>
                  <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                    {c.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 底部数据 */}
        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 600,
            color: COLORS.accent,
            padding: "10px 32px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            opacity: interpolate(dataProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(dataProg, [0, 1], [0.9, 1])})`,
          }}
        >
          已验证案例：$72 万 / 年
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
