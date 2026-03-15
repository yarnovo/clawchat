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
    runtime: "OpenClaw",
    method: "npm 包",
    target: "ClawHub",
    difficulty: "最简单",
    traits: ["npm publish", "ClawHub 分发", "零门槛"],
  },
  {
    runtime: "IronClaw",
    method: "WASM 工具",
    target: "WebAssembly",
    difficulty: "最安全",
    traits: ["编译到 WASM", "沙箱隔离", "门槛最高"],
  },
  {
    runtime: "NanoClaw",
    method: "源码修改",
    target: "TypeScript",
    difficulty: "最直接",
    traits: ["直接改源码", "不可分发", "适合个人"],
  },
];

export const SceneTeExtend: React.FC = () => {
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
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          扩展难度对比
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {columns.map((col, ci) => {
            const delay = 12 + ci * 14;
            const prog = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.6 },
            });
            return (
              <div
                key={col.runtime}
                style={{
                  width: 340,
                  padding: "28px 24px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {col.runtime}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 26,
                    fontWeight: 600,
                    color: COLORS.accent,
                  }}
                >
                  {col.method}
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 1,
                    background: COLORS.border,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    width: "100%",
                  }}
                >
                  {col.traits.map((t) => (
                    <div
                      key={t}
                      style={{
                        fontFamily: FONT_SANS,
                        fontSize: 24,
                        color: COLORS.muted,
                        padding: "6px 14px",
                        borderRadius: 8,
                        background: COLORS.bg,
                        border: `1px solid ${COLORS.border}`,
                        textAlign: "center",
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    fontWeight: 600,
                    color: COLORS.accent,
                    marginTop: 4,
                  }}
                >
                  {col.difficulty}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
