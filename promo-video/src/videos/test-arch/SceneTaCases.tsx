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

const columns = [
  {
    title: "Session",
    items: ["存取消息", "SQLite 持久化", "多会话隔离"],
  },
  {
    title: "Persona",
    items: ["加载四个文件", "截断策略", "受保护文件"],
  },
  {
    title: "Agent",
    items: ["简单对话", "单工具调用", "多工具调用", "工具报错", "最大轮数"],
  },
];

export const SceneTaCases: React.FC = () => {
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
            transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
          }}
        >
          核心测试用例
        </div>

        <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
          {columns.map((col, ci) => {
            const colDelay = 10 + ci * 12;
            const colProg = spring({ frame: frame - colDelay, fps, config: { damping: 14, mass: 0.7 } });
            return (
              <div
                key={col.title}
                style={{
                  background: COLORS.card,
                  border: ci === 2 ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  boxShadow: COLORS.cardShadow,
                  padding: "28px 36px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minWidth: 260,
                  opacity: interpolate(colProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(colProg, [0, 1], [24, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: ci === 2 ? COLORS.accent : COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  {col.title}
                </div>
                {col.items.map((item, ii) => {
                  const itemDelay = colDelay + 8 + ii * 6;
                  const itemProg = spring({ frame: frame - itemDelay, fps, config: { damping: 14, mass: 0.5 } });
                  return (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        opacity: interpolate(itemProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(itemProg, [0, 1], [-12, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: COLORS.accent,
                          flexShrink: 0,
                        }}
                      />
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 25,
                          color: COLORS.text,
                        }}
                      >
                        {item}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
