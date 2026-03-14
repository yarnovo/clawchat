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

const groups = [
  {
    title: "模型配置",
    fields: [
      { name: "model", type: "String", desc: "模型名称" },
      { name: "apiKey", type: "String?", desc: "加密 API Key" },
      { name: "baseUrl", type: "String?", desc: "自定义 API 地址" },
      { name: "systemPrompt", type: "String?", desc: "系统提示词" },
    ],
  },
  {
    title: "容器信息",
    fields: [
      { name: "runtime", type: "AgentRuntime", desc: "运行时类型" },
      { name: "containerId", type: "String?", desc: "Docker 容器 ID" },
      { name: "volumeName", type: "String?", desc: "Volume 名称" },
      { name: "gatewayToken", type: "String?", desc: "连接令牌" },
      { name: "status", type: "AgentStatus", desc: "运行状态" },
    ],
  },
];

export const SceneAgentDbConfig: React.FC = () => {
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
        {/* Title */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 60,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          AgentConfig 配置表
        </div>

        {/* Two-column cards */}
        <div style={{ display: "flex", gap: 32 }}>
          {groups.map((group, gi) => {
            const groupProg = spring({
              frame: frame - 10 - gi * 12,
              fps,
              config: { damping: 14 },
            });

            return (
              <div
                key={group.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  width: 440,
                  overflow: "hidden",
                  opacity: interpolate(groupProg, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(groupProg, [0, 1], [30, 0])}px)`,
                }}
              >
                {/* Group header */}
                <div
                  style={{
                    padding: "14px 24px",
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontFamily: FONT_SANS,
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {group.title}
                </div>

                {/* Fields */}
                {group.fields.map((f, fi) => {
                  const rowProg = spring({
                    frame: frame - 18 - gi * 12 - fi * 5,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });

                  return (
                    <div
                      key={f.name}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "10px 24px",
                        gap: 2,
                        opacity: interpolate(rowProg, [0, 1], [0, 1]),
                        background:
                          fi % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 24,
                            fontWeight: 600,
                            color: COLORS.text,
                          }}
                        >
                          {f.name}
                        </span>
                        <span
                          style={{
                            fontFamily: MONO,
                            fontSize: 24,
                            color: COLORS.accent,
                          }}
                        >
                          {f.type}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_SANS,
                          fontSize: 24,
                          color: COLORS.muted,
                        }}
                      >
                        {f.desc}
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
