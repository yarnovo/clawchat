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

const headers = ["", "Remotion", "After Effects", "FFmpeg", "Motion Canvas"];
const rows = [
  { label: "驱动方式", values: ["代码（React）", "GUI 手动", "命令行", "代码（Canvas）"] },
  { label: "自动化", values: ["原生支持", "需脚本桥接", "可脚本化", "可脚本化"] },
  { label: "批量个性化", values: ["模板 + 数据", "不支持", "极复杂", "不支持"] },
  { label: "版本控制", values: ["Git 原生", "二进制文件", "脚本级别", "Git 原生"] },
  { label: "生态", values: ["npm + React", "Adobe 插件", "滤镜库", "社区较小"] },
];

export const SceneCompare: React.FC = () => {
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
          告别传统工具
        </div>

        <div
          style={{
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          {(() => {
            const hEnt = spring({ frame: frame - 8, fps, config: { damping: 14 } });
            return (
              <div style={{ display: "flex", borderBottom: `2px solid ${COLORS.border}`, opacity: interpolate(hEnt, [0, 1], [0, 1]) }}>
                {headers.map((h, hi) => (
                  <div
                    key={h || "label"}
                    style={{
                      width: hi === 0 ? 140 : 220,
                      padding: "16px 20px",
                      fontFamily: hi === 0 ? FONT_SANS : MONO,
                      fontSize: 24,
                      fontWeight: 700,
                      color: hi === 1 ? COLORS.accent : COLORS.text,
                      borderRight: hi < headers.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Rows */}
          {rows.map((row, ri) => {
            const delay = 15 + ri * 8;
            const ent = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  borderBottom: ri < rows.length - 1 ? `1px solid ${COLORS.border}` : "none",
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [8, 0])}px)`,
                }}
              >
                <div style={{ width: 140, padding: "14px 20px", fontFamily: FONT_SANS, fontSize: 22, fontWeight: 600, color: COLORS.text, borderRight: `1px solid ${COLORS.border}` }}>
                  {row.label}
                </div>
                {row.values.map((v, vi) => (
                  <div
                    key={vi}
                    style={{
                      width: 220,
                      padding: "14px 20px",
                      fontFamily: FONT_SANS,
                      fontSize: 22,
                      fontWeight: vi === 0 ? 600 : 400,
                      color: vi === 0 ? COLORS.accent : COLORS.muted,
                      borderRight: vi < row.values.length - 1 ? `1px solid ${COLORS.border}` : "none",
                    }}
                  >
                    {v}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
