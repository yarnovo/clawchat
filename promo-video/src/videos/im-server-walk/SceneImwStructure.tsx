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

const lines = [
  "src/",
  "├── app.ts           → 入口 + 中间件",
  "├── routes/",
  "│   ├── auth.ts      → 注册 / 登录",
  "│   ├── accounts.ts  → 账号资料",
  "│   ├── friends.ts   → 好友管理",
  "│   ├── conversations.ts → 对话",
  "│   └── messages.ts  → 消息 CRUD",
  "├── agent-reply-worker.ts → 队列消费",
  "└── ws.ts            → WebSocket",
];

export const SceneImwStructure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
          项目结构
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            background: COLORS.card,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
            padding: "24px 36px",
            width: 780,
          }}
        >
          {lines.map((line, i) => {
            const delay = 10 + i * 5;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: COLORS.text,
                  lineHeight: "38px",
                  whiteSpace: "pre",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(prog, [0, 1], [30, 0])}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
