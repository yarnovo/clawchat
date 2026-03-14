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
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}
      >
        {/* Phone mockup */}
        <div
          style={{
            transform: `scale(${phoneScale})`,
            width: 580,
            background: COLORS.card,
            borderRadius: 32,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "14px 24px",
              borderBottom: `1px solid ${COLORS.border}`,
              gap: 12,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted }}>
              ←
            </div>
            <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: COLORS.text }}>
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
                background: COLORS.bg,
                borderRadius: 12,
                border: `1px solid ${COLORS.border}`,
                gap: 8,
              }}
            >
              <span style={{ fontSize: 28, color: COLORS.muted }}>🔍</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  color: displaySearch ? COLORS.text : COLORS.subtle,
                }}
              >
                {displaySearch || "搜索技能..."}
                {cursorOn && <span style={{ color: COLORS.accent }}>|</span>}
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
                  fontFamily: FONT_SANS,
                  fontSize: 28,
                  color: COLORS.subtle,
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
        background: installed ? "rgba(218,119,86,0.04)" : COLORS.bg,
        borderRadius: 12,
        border: `1px solid ${installed ? COLORS.accent : COLORS.border}`,
        opacity: interpolate(ent, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(ent, [0, 1], [15, 0])}px)`,
      }}
    >
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_SANS, fontSize: 28, fontWeight: 600, color: COLORS.text }}>
          {desc}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            color: COLORS.muted,
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
              background: COLORS.border,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: COLORS.accent,
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
          fontFamily: FONT_SANS,
          fontSize: 26,
          fontWeight: 600,
          ...(installed
            ? {
                color: COLORS.accent,
                background: "rgba(218,119,86,0.08)",
                border: `1px solid rgba(218,119,86,0.2)`,
              }
            : installing
              ? {
                  color: COLORS.muted,
                  background: COLORS.bg,
                  border: `1px solid ${COLORS.border}`,
                }
              : {
                  color: COLORS.card,
                  background: COLORS.accent,
                  border: "none",
                }),
        }}
      >
        {installed ? "已安装" : installing ? "安装中..." : "安装"}
      </div>
    </div>
  );
};
