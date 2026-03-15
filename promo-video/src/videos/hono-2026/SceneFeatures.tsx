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

const features = [
  {
    title: "RPC Client",
    desc: "端到端类型安全\n无需 codegen",
    code: "const res = await client.api.users.$get()",
  },
  {
    title: "Validator",
    desc: "内置 Zod / Valibot\n请求自动校验",
    code: "app.post('/users', zValidator('json', schema), handler)",
  },
  {
    title: "OpenAPI",
    desc: "路由即文档\n自动生成 Swagger",
    code: "app.doc('/doc', { openapi: '3.0.0' })",
  },
  {
    title: "Middleware",
    desc: "CORS / JWT / 日志\n开箱即用",
    code: "app.use(cors(), jwt({ secret }))",
  },
];

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

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
          开发者体验拉满
        </div>

        {/* Feature grid 2x2 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "center",
            maxWidth: 1400,
          }}
        >
          {features.map((f, i) => {
            const delay = 15 + i * 10;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.7 },
            });
            return (
              <div
                key={f.title}
                style={{
                  width: 620,
                  padding: "24px 32px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(ent, [0, 1], [30, 0])}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                {/* Feature title + desc row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                  <div style={{ fontFamily: FONT, fontSize: 32, fontWeight: 700, color: COLORS.accent }}>
                    {f.title}
                  </div>
                  <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, whiteSpace: "pre-line", lineHeight: 1.5 }}>
                    {f.desc}
                  </div>
                </div>
                {/* Code */}
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 22,
                    color: COLORS.text,
                    background: COLORS.bg,
                    padding: "12px 16px",
                    borderRadius: 8,
                    border: `1px solid ${COLORS.border}`,
                    whiteSpace: "pre",
                    overflow: "hidden",
                  }}
                >
                  {f.code}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
