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

const runtimes = [
  {
    name: "OpenClaw",
    color: COLORS.accent,
    abilities: ["浏览器自动化", "画布操作", "文本转语音"],
  },
  {
    name: "NanoClaw",
    color: "#5B8DEF",
    abilities: ["Agent Teams", "MCP 通配符扩展", "Skill 热加载"],
  },
  {
    name: "IronClaw",
    color: "#7C5CBF",
    abilities: ["图像生成与编辑", "密钥安全管理", "工具市场", "定时任务调度"],
  },
];

export const SceneTcUnique: React.FC = () => {
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
          gap: 40,
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
          独有能力对比
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {runtimes.map((rt, ri) => {
            const delay = 10 + ri * 10;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });
            return (
              <div
                key={rt.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  padding: "32px 36px",
                  borderRadius: 20,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 360,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: rt.color,
                  }}
                >
                  {rt.name}
                </div>
                <div
                  style={{
                    width: 60,
                    height: 3,
                    borderRadius: 2,
                    background: rt.color,
                    opacity: 0.4,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  {rt.abilities.map((ab, ai) => {
                    const itemDelay = delay + 8 + ai * 6;
                    const itemProg = spring({
                      frame: frame - itemDelay,
                      fps,
                      config: { damping: 14, mass: 0.5 },
                    });
                    return (
                      <div
                        key={ab}
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 26,
                          color: COLORS.text,
                          padding: "8px 20px",
                          borderRadius: 10,
                          background: `${rt.color}10`,
                          border: `1px solid ${rt.color}30`,
                          opacity: interpolate(itemProg, [0, 1], [0, 1]),
                          transform: `scale(${interpolate(itemProg, [0, 1], [0.8, 1])})`,
                        }}
                      >
                        {ab}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
