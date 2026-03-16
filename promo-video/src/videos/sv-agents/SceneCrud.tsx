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

const zodSchema = `const createAgentSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  persona:     z.string().max(5000).optional(),
  skills:      z.array(z.string()).optional(),
});`;

const insertCode = `const [agent] = await db
  .insert(agents)
  .values({
    ownerId: userId,
    name,
    config: { persona, skills },
  })
  .returning();`;

export const SceneCrud: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  const schemaEnt = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  const insertEnt = spring({
    frame: frame - 35,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

  const noteEnt = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, mass: 0.7 },
  });

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
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          创建 Agent — Zod 校验
        </div>

        {/* Two code blocks side by side */}
        <div
          style={{
            display: "flex",
            gap: 24,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Zod schema */}
          <div
            style={{
              opacity: interpolate(schemaEnt, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(schemaEnt, [0, 1], [30, 0])}px)`,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              maxWidth: 600,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
                marginBottom: 12,
              }}
            >
              Zod Validation Schema
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.text,
                whiteSpace: "pre",
                lineHeight: 1.6,
              }}
            >
              {zodSchema}
            </div>
          </div>

          {/* Insert code */}
          <div
            style={{
              opacity: interpolate(insertEnt, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(insertEnt, [0, 1], [30, 0])}px)`,
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              boxShadow: COLORS.cardShadow,
              padding: "20px 28px",
              maxWidth: 520,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                color: COLORS.muted,
                marginBottom: 12,
              }}
            >
              Drizzle ORM Insert
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                color: COLORS.text,
                whiteSpace: "pre",
                lineHeight: 1.6,
              }}
            >
              {insertCode}
            </div>
          </div>
        </div>

        {/* Soft delete note */}
        <div
          style={{
            opacity: interpolate(noteEnt, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(noteEnt, [0, 1], [20, 0])}px)`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "14px 28px",
            background: COLORS.card,
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            boxShadow: COLORS.cardShadow,
          }}
        >
          <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
            软删除 →
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              color: COLORS.accent,
              whiteSpace: "pre",
            }}
          >
            {"set({ deletedAt: new Date(), status: 'deleted' })"}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
