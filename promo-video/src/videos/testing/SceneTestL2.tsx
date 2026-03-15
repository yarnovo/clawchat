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

const apis = [
  "注册 / 登录 / 刷新 Token",
  "好友申请 / 接受 / 拒绝 / 删除",
  "消息发送 / 撤回 / 分页拉取",
  "对话创建 / 列表 / 详情",
];

export const SceneTestL2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const badgeProg = spring({ frame: frame - 60, fps, config: { damping: 14 } });

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
          L2 — API 端到端测试
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 28,
            color: COLORS.accent,
            padding: "10px 24px",
            borderRadius: 10,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            opacity: interpolate(codeProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(codeProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Hono app.request() 直连测试库
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: 700,
          }}
        >
          {apis.map((api, i) => {
            const delay = 20 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={api}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                    flexShrink: 0,
                  }}
                >
                  ●
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.text,
                  }}
                >
                  {api}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 600,
            color: COLORS.card,
            background: COLORS.accent,
            padding: "8px 24px",
            borderRadius: 8,
            marginTop: 8,
            opacity: interpolate(badgeProg, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProg, [0, 1], [0.8, 1])})`,
          }}
        >
          零 Mock，真实数据库
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
