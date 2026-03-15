import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

const rows = [
  { dimension: "工具沙箱", openclaw: "无隔离", ironclaw: "WASM 沙箱" },
  { dimension: "凭证管理", openclaw: "环境变量", ironclaw: "AES-256-GCM" },
  { dimension: "泄露检测", openclaw: "无", ironclaw: "双端扫描" },
  { dimension: "网络控制", openclaw: "无限制", ironclaw: "白名单" },
  { dimension: "容器通信", openclaw: "HTTP", ironclaw: "HMAC 签名" },
];

export const SceneSfOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const headerProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });

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
          对比总结
        </div>

        {/* 表格 */}
        <div
          style={{
            width: 920,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          {/* 表头 */}
          <div
            style={{
              display: "flex",
              background: "#F5F0EB",
              opacity: interpolate(headerProg, [0, 1], [0, 1]),
            }}
          >
            <div style={{ flex: 1, padding: "16px 24px", fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
              维度
            </div>
            <div style={{ flex: 1, padding: "16px 24px", fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
              OpenClaw
            </div>
            <div style={{ flex: 1, padding: "16px 24px", fontFamily: FONT_SANS, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
              IronClaw
            </div>
          </div>
          {/* 数据行 */}
          {rows.map((row, i) => {
            const rowProg = spring({ frame: frame - 15 - i * 6, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={row.dimension}
                style={{
                  display: "flex",
                  background: i % 2 === 0 ? COLORS.card : "#FDFCFA",
                  borderTop: `1px solid ${COLORS.border}`,
                  opacity: interpolate(rowProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(rowProg, [0, 1], [10, 0])}px)`,
                }}
              >
                <div style={{ flex: 1, padding: "14px 24px", fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                  {row.dimension}
                </div>
                <div style={{ flex: 1, padding: "14px 24px", fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted }}>
                  {row.openclaw}
                </div>
                <div style={{ flex: 1, padding: "14px 24px", fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text }}>
                  {row.ironclaw}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部总结 */}
        {(() => {
          const summaryProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });
          return (
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.muted,
                textAlign: "center",
                lineHeight: 1.6,
                opacity: interpolate(summaryProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(summaryProg, [0, 1], [20, 0])}px)`,
              }}
            >
              选择取决于你的威胁模型
            </div>
          );
        })()}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
