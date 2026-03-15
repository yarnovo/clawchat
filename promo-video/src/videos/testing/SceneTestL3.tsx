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

const stack = ["Flutter Web", "→", "im-server", "→", "PostgreSQL"];

const journeys = [
  "注册新账号 → 登录",
  "搜索用户 → 加好友",
  "发送消息 → 接收回复",
  "撤回消息 → 验证删除",
];

export const SceneTestL3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });
  const stackProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const tagProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

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
          L3 — 全链路集成测试
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            opacity: interpolate(stackProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(stackProg, [0, 1], [20, 0])}px)`,
          }}
        >
          {stack.map((item, i) => {
            const isArrow = item === "→";
            return (
              <div
                key={i}
                style={{
                  fontFamily: isArrow ? FONT_SANS : MONO,
                  fontSize: isArrow ? 36 : 28,
                  fontWeight: isArrow ? 300 : 700,
                  color: isArrow ? COLORS.subtle : COLORS.text,
                  padding: isArrow ? "0" : "12px 24px",
                  borderRadius: isArrow ? 0 : 10,
                  background: isArrow ? "transparent" : COLORS.card,
                  border: isArrow ? "none" : `1px solid ${COLORS.border}`,
                  boxShadow: isArrow ? "none" : COLORS.cardShadow,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: 600,
            marginTop: 8,
          }}
        >
          {journeys.map((j, i) => {
            const delay = 20 + i * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });

            return (
              <div
                key={j}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 28px",
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
                    fontSize: 22,
                    fontWeight: 700,
                    color: COLORS.accent,
                    width: 28,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 26,
                    color: COLORS.text,
                  }}
                >
                  {j}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.accent,
            padding: "8px 20px",
            borderRadius: 8,
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            marginTop: 4,
            opacity: interpolate(tagProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(tagProg, [0, 1], [20, 0])}px)`,
          }}
        >
          Playwright 驱动浏览器
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
