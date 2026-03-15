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

export const SceneLsTruncate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const cardsProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [20, 0])}px)`,
            marginBottom: 8,
          }}
        >
          截断策略
        </div>

        <div
          style={{
            display: "flex",
            gap: 48,
            opacity: interpolate(cardsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardsProg, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* OpenClaw card */}
          <div
            style={{
              padding: "36px 44px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              minWidth: 380,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              OpenClaw
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              硬截断
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {(() => {
                const delay1 = 25;
                const prog1 = spring({ frame: frame - delay1, fps, config: { damping: 14, mass: 0.6 } });
                return (
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      opacity: interpolate(prog1, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog1, [0, 1], [-20, 0])}px)`,
                    }}
                  >
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                      单文件
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 32,
                        fontWeight: 700,
                        color: COLORS.accent,
                        padding: "6px 18px",
                        borderRadius: 10,
                        background: "rgba(218, 119, 86, 0.08)",
                      }}
                    >
                      20K
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const delay2 = 35;
                const prog2 = spring({ frame: frame - delay2, fps, config: { damping: 14, mass: 0.6 } });
                return (
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      opacity: interpolate(prog2, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog2, [0, 1], [-20, 0])}px)`,
                    }}
                  >
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                      总计
                    </div>
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 32,
                        fontWeight: 700,
                        color: COLORS.accent,
                        padding: "6px 18px",
                        borderRadius: 10,
                        background: "rgba(218, 119, 86, 0.08)",
                      }}
                    >
                      150K
                    </div>
                  </div>
                );
              })()}
            </div>
            {(() => {
              const delay3 = 45;
              const prog3 = spring({ frame: frame - delay3, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.muted,
                    opacity: interpolate(prog3, [0, 1], [0, 1]),
                  }}
                >
                  ... 中间省略号截断 ...
                </div>
              );
            })()}
          </div>

          {/* IronClaw card */}
          <div
            style={{
              padding: "36px 44px",
              borderRadius: 16,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              minWidth: 380,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 30,
                fontWeight: 700,
                color: COLORS.accent,
              }}
            >
              IronClaw
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
              }}
            >
              混合搜索
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {(() => {
                const delay4 = 30;
                const prog4 = spring({ frame: frame - delay4, fps, config: { damping: 14, mass: 0.6 } });
                return (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                      padding: "10px 24px",
                      borderRadius: 10,
                      background: "rgba(218, 119, 86, 0.06)",
                      border: `1px solid ${COLORS.border}`,
                      opacity: interpolate(prog4, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog4, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    BM25 全文检索
                  </div>
                );
              })()}
              {(() => {
                const delay5 = 40;
                const prog5 = spring({ frame: frame - delay5, fps, config: { damping: 14, mass: 0.6 } });
                return (
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 28,
                      color: COLORS.subtle,
                      opacity: interpolate(prog5, [0, 1], [0, 1]),
                    }}
                  >
                    +
                  </div>
                );
              })()}
              {(() => {
                const delay6 = 50;
                const prog6 = spring({ frame: frame - delay6, fps, config: { damping: 14, mass: 0.6 } });
                return (
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.text,
                      padding: "10px 24px",
                      borderRadius: 10,
                      background: "rgba(218, 119, 86, 0.06)",
                      border: `1px solid ${COLORS.border}`,
                      opacity: interpolate(prog6, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(prog6, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    向量语义搜索
                  </div>
                );
              })()}
            </div>
            {(() => {
              const delay7 = 55;
              const prog7 = spring({ frame: frame - delay7, fps, config: { damping: 14, mass: 0.6 } });
              return (
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    opacity: interpolate(prog7, [0, 1], [0, 1]),
                  }}
                >
                  只加载最相关的记忆片段
                </div>
              );
            })()}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
