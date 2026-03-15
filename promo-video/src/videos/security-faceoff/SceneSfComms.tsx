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

export const SceneSfComms: React.FC = () => {
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
          容器间通信
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {/* OpenClaw - 普通 HTTP */}
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
            {/* HTTP 流程 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              {[
                { label: "容器", desc: "发起 HTTP 回调" },
                { label: "宿主", desc: "接收并处理" },
              ].map((node, i) => {
                const nodeProg = spring({ frame: frame - 25 - i * 10, fps, config: { damping: 14 } });
                return (
                  <div key={node.label}>
                    <div
                      style={{
                        padding: "16px 28px",
                        borderRadius: 10,
                        background: "#F5F0EB",
                        textAlign: "center",
                        opacity: interpolate(nodeProg, [0, 1], [0, 1]),
                        transform: `translateY(${interpolate(nodeProg, [0, 1], [10, 0])}px)`,
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                        {node.label}
                      </div>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                        {node.desc}
                      </div>
                    </div>
                    {i === 0 && (
                      <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 28, color: COLORS.subtle, padding: "4px 0" }}>
                        |
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              普通 HTTP，无身份验证
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              可被伪造请求
            </div>
          </div>

          {/* IronClaw - HMAC 签名 */}
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
            {/* HMAC 签名流程 */}
            {[
              { step: "1", label: "签名生成", desc: "HMAC-SHA256 签名请求体" },
              { step: "2", label: "请求附签", desc: "X-Signature 头部" },
              { step: "3", label: "双向验证", desc: "容器与宿主互相校验" },
            ].map((item, i) => {
              const stepProg = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 14 } });
              return (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    opacity: interpolate(stepProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(stepProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 28,
                      fontWeight: 700,
                      color: COLORS.accent,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      border: `2px solid ${COLORS.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 26, fontWeight: 600, color: COLORS.text }}>
                      {item.label}
                    </div>
                    <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, lineHeight: 1.6 }}>
              伪造请求无法通过验证
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
