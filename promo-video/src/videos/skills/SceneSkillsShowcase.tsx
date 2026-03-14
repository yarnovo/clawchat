import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { COLORS, FONT } from "../../constants";

// Simulated skill install flow
const installSteps = [
  { frame: 15, type: "search", text: "web-search" },
  { frame: 55, type: "result", name: "web-search", desc: "网页搜索与摘要", downloads: "12.3k" },
  { frame: 85, type: "installing", name: "web-search" },
  { frame: 110, type: "installed", name: "web-search" },
  { frame: 130, type: "result2", name: "code-review", desc: "代码审查与建议", downloads: "8.7k" },
  { frame: 150, type: "installed2", name: "code-review" },
];

export const SceneSkillsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneScale = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });

  // Typewriter for search input
  const searchText = "web-search";
  const typeStart = 15;
  const charsVisible = Math.min(
    Math.floor((frame - typeStart) / 2.5),
    searchText.length,
  );
  const displaySearch = frame >= typeStart ? searchText.slice(0, Math.max(0, charsVisible)) : "";
  const cursorOn = frame % 16 < 10 && charsVisible < searchText.length && frame >= typeStart;

  // Install progress
  const installProg = frame >= 85 && frame < 110
    ? interpolate(frame, [85, 108], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : frame >= 110 ? 100 : 0;

  return (
    <AbsoluteFill>
      <GradientBg colors={["#0a0a2e", "#151540", "#0a0a2e"]} />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}
      >
        {/* Phone mockup */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            width: 580,
            background: "rgba(20,20,45,0.95)",
            borderRadius: 32,
            border: "1px solid rgba(108,99,255,0.15)",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(108,99,255,0.1)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 24px",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              gap: 12,
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              ←
            </div>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.white }}>
              添加技能
            </div>
          </div>

          {/* Search bar */}
          <div style={{ padding: "16px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 16px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 12,
                border: "1px solid rgba(108,99,255,0.2)",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, opacity: 0.4 }}>🔍</span>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 16,
                  color: displaySearch ? COLORS.white : "rgba(255,255,255,0.3)",
                }}
              >
                {displaySearch || "搜索技能..."}
                {cursorOn && <span style={{ color: COLORS.primary }}>|</span>}
              </span>
            </div>
          </div>

          {/* Results area */}
          <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10, minHeight: 380 }}>
            {/* Search result 1 */}
            {frame >= 55 && (
              <SkillResultCard
                frame={frame}
                fps={fps}
                showAt={55}
                icon="🌐"
                name="web-search"
                desc="网页搜索与摘要"
                downloads="12.3k"
                installed={frame >= 110}
                installing={frame >= 85 && frame < 110}
                progress={installProg}
              />
            )}

            {/* Search result 2 */}
            {frame >= 130 && (
              <SkillResultCard
                frame={frame}
                fps={fps}
                showAt={130}
                icon="💻"
                name="code-review"
                desc="代码审查与建议"
                downloads="8.7k"
                installed={frame >= 150}
                installing={false}
                progress={0}
              />
            )}

            {/* More results hint */}
            {frame >= 130 && (
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: 13,
                  color: "rgba(255,255,255,0.2)",
                  textAlign: "center",
                  padding: "8px 0",
                  opacity: interpolate(
                    spring({ frame: frame - 135, fps, config: { damping: 15 } }),
                    [0, 1], [0, 1],
                  ),
                }}
              >
                还有 236 个相关技能...
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SkillResultCard: React.FC<{
  frame: number;
  fps: number;
  showAt: number;
  icon: string;
  name: string;
  desc: string;
  downloads: string;
  installed: boolean;
  installing: boolean;
  progress: number;
}> = ({ frame, fps, showAt, icon, name, desc, downloads, installed, installing, progress }) => {
  const ent = spring({ frame: frame - showAt, fps, config: { damping: 15, mass: 0.6 } });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: installed
          ? "rgba(7,193,96,0.06)"
          : "rgba(255,255,255,0.03)",
        borderRadius: 14,
        border: installed
          ? "1px solid rgba(7,193,96,0.2)"
          : "1px solid rgba(255,255,255,0.06)",
        opacity: interpolate(ent, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(ent, [0, 1], [15, 0])}px)`,
      }}
    >
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, color: COLORS.white }}>
          {desc}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono, SF Mono, monospace",
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {name} · {downloads} downloads
        </div>
        {/* Progress bar */}
        {installing && (
          <div
            style={{
              marginTop: 6,
              height: 3,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.cyan})`,
                borderRadius: 2,
              }}
            />
          </div>
        )}
      </div>
      {/* Action button */}
      <div
        style={{
          padding: "6px 16px",
          borderRadius: 8,
          fontFamily: FONT,
          fontSize: 14,
          fontWeight: 600,
          ...(installed
            ? {
                color: COLORS.accent,
                background: "rgba(7,193,96,0.1)",
                border: "1px solid rgba(7,193,96,0.2)",
              }
            : installing
              ? {
                  color: COLORS.cyan,
                  background: "rgba(0,210,255,0.08)",
                  border: "1px solid rgba(0,210,255,0.15)",
                }
              : {
                  color: COLORS.white,
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.cyan})`,
                  border: "none",
                }),
        }}
      >
        {installed ? "已安装" : installing ? "安装中..." : "安装"}
      </div>
    </div>
  );
};
