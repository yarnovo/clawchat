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

const modules = [
  {
    name: "auth",
    desc: "用户登录认证",
    apis: ["POST /login", "POST /register"],
    color: "#DA7756",
  },
  {
    name: "agents",
    desc: "Agent 增删改查",
    apis: ["GET /agents", "POST /agents", "PUT /agents/:id"],
    color: "#C06840",
  },
  {
    name: "containers",
    desc: "容器生命周期",
    apis: ["POST /run", "POST /stop", "POST /fork", "POST /commit"],
    color: "#B05A35",
  },
  {
    name: "market",
    desc: "市场浏览搜索上架",
    apis: ["GET /market", "POST /publish"],
    color: "#DA7756",
  },
  {
    name: "billing",
    desc: "按使用量计费",
    apis: ["GET /usage", "GET /invoices"],
    color: "#C06840",
  },
];

export const SceneBaApi: React.FC = () => {
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
          gap: 36,
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
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          五个 API 模块
        </div>

        {/* Module cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 20,
            maxWidth: 1400,
          }}
        >
          {modules.map((mod, i) => {
            const delay = 12 + i * 8;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            const isContainer = mod.name === "containers";
            return (
              <div
                key={mod.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: isContainer ? COLORS.accent : COLORS.card,
                  border: isContainer ? "none" : `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "24px 28px",
                  width: i === 2 ? 300 : 260,
                  boxShadow: isContainer
                    ? "0 4px 24px rgba(218,119,86,0.2)"
                    : COLORS.cardShadow,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [30, 0])}px)`,
                  borderLeft: isContainer ? "none" : `4px solid ${mod.color}`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 28,
                    fontWeight: 700,
                    color: isContainer ? COLORS.white : mod.color,
                  }}
                >
                  {mod.name}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 22,
                    color: isContainer ? "rgba(255,255,255,0.9)" : COLORS.text,
                    lineHeight: 1.4,
                  }}
                >
                  {mod.desc}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  {mod.apis.map((api) => (
                    <div
                      key={api}
                      style={{
                        fontFamily: MONO,
                        fontSize: 15,
                        color: isContainer ? "rgba(255,255,255,0.7)" : COLORS.muted,
                      }}
                    >
                      {api}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
