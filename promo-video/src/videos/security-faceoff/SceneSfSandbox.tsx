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

export const SceneSfSandbox: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const leftProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const rightProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });

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
          工具沙箱
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* OpenClaw - 无隔离 */}
          <div
            style={{
              width: 520,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              opacity: interpolate(leftProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftProg, [0, 1], [-40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.accent }}>
              OpenClaw
            </div>
            {/* 同进程示意 */}
            <div
              style={{
                padding: "20px 24px",
                borderRadius: 12,
                border: `2px dashed ${COLORS.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 24, color: COLORS.text, textAlign: "center" }}>
                Agent 进程
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {["Tool A", "Tool B", "Tool C"].map((tool, i) => {
                  const toolProg = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 14 } });
                  return (
                    <div
                      key={tool}
                      style={{
                        fontFamily: MONO,
                        fontSize: 24,
                        color: COLORS.muted,
                        padding: "8px 16px",
                        borderRadius: 8,
                        background: "#F5F0EB",
                        opacity: interpolate(toolProg, [0, 1], [0, 1]),
                      }}
                    >
                      {tool}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              同一进程，无隔离边界
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              工具崩溃 = Agent 崩溃
            </div>
          </div>

          {/* IronClaw - WASM 沙箱 */}
          <div
            style={{
              width: 520,
              padding: "32px 36px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              gap: 18,
              opacity: interpolate(rightProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightProg, [0, 1], [40, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 30, fontWeight: 600, color: COLORS.accent }}>
              IronClaw
            </div>
            {/* WASM 沙箱分层 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {["WASM 沙箱 A", "WASM 沙箱 B", "WASM 沙箱 C"].map((box, i) => {
                const boxProg = spring({ frame: frame - 30 - i * 6, fps, config: { damping: 14 } });
                return (
                  <div
                    key={box}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: `1.5px solid ${COLORS.border}`,
                      background: "#F5F0EB",
                      fontFamily: MONO,
                      fontSize: 24,
                      color: COLORS.text,
                      textAlign: "center",
                      opacity: interpolate(boxProg, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(boxProg, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    {box}
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              Capability 权限 + 燃料计量
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              工具崩溃不影响 Agent
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
