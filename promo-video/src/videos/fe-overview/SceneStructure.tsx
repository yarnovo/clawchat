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

const TREE = `src/
├── main.tsx              # 入口
├── App.tsx               # 根组件 → Outlet
├── router.tsx            # TanStack Router
├── index.css             # Tailwind 入口
│
├── features/
│   └── chat/             # 聊天核心功能
│
├── pages/
│   ├── chat/             # 聊天页面
│   ├── agents/           # Agent 管理
│   └── settings/         # 设置页面
│
├── components/
│   ├── ui/               # shadcn 组件
│   └── layout/           # 布局组件
│
├── hooks/                # 自定义 Hooks
├── services/             # API 服务层
├── stores/               # Zustand 状态
├── types/                # TypeScript 类型
└── lib/                  # 工具函数`;

const highlights = [
  { label: "Feature 模块", desc: "chat 独立封装", color: COLORS.accent },
  { label: "Page 路由", desc: "按功能分目录", color: "#38BDF8" },
  { label: "Shared 层", desc: "components / hooks / stores", color: "#8B7E74" },
];

export const SceneStructure: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const treeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const tagsProg = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingTop: 50,
          paddingBottom: 140,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          Feature-first 目录结构
        </div>

        {/* Content: tree + highlights */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "90%",
            maxWidth: 1600,
            alignItems: "flex-start",
          }}
        >
          {/* Tree */}
          <div
            style={{
              flex: 2,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "24px 32px",
              opacity: interpolate(treeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(treeProg, [0, 1], [20, 0])}px)`,
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 20,
                lineHeight: 1.55,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {TREE}
            </pre>
          </div>

          {/* Highlights */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 20,
              opacity: interpolate(tagsProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(tagsProg, [0, 1], [16, 0])}px)`,
            }}
          >
            {highlights.map((h, i) => {
              const delay = 40 + i * 10;
              const cardProg = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={h.label}
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    boxShadow: COLORS.cardShadow,
                    padding: "20px 24px",
                    opacity: interpolate(cardProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(cardProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 24,
                      fontWeight: 700,
                      color: h.color,
                      marginBottom: 8,
                    }}
                  >
                    {h.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {h.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
