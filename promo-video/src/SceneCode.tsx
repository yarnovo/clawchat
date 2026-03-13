import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "./GradientBg";
import { Particles } from "./Particles";
import { FONT, MONO } from "./constants";

const lines = [
  'import { useCurrentFrame } from "remotion";',
  "",
  "export const MyVideo = () => {",
  "  const frame = useCurrentFrame();",
  "  const opacity = Math.min(1, frame / 30);",
  "",
  "  return (",
  '    <div style={{ opacity }}>',
  "      Hello, Remotion!",
  "    </div>",
  "  );",
  "};",
];

function lineColor(l: string) {
  if (l.startsWith("import") || l.startsWith("export")) return "#cba6f7";
  if (l.includes("const ")) return "#89b4fa";
  if (l.includes("return")) return "#f38ba8";
  if (l.includes("<") || l.includes("/>")) return "#a6e3a1";
  return "#cdd6f4";
}

export const SceneCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const winScale = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });

  return (
    <AbsoluteFill>
      <GradientBg colors={["#1e1e3f", "#2d2b55", "#1e1e3f"]} />
      <Particles />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 40 }}
      >
        <div
          style={{
            fontFamily: FONT,
            fontSize: 44,
            fontWeight: 800,
            color: "#fff",
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          写代码，就是做视频
        </div>

        <div
          style={{
            transform: `scale(${winScale})`,
            background: "#1e1e2e",
            borderRadius: 16,
            width: 800,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Title bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#181825" }}>
            {["#f38ba8", "#f9e2af", "#a6e3a1"].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
            ))}
            <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 13, color: "#6c7086" }}>
              MyVideo.tsx
            </span>
          </div>

          {/* Code */}
          <div style={{ padding: "20px 24px" }}>
            {lines.map((l, i) => {
              const d = 15 + i * 4;
              const op = interpolate(frame, [d, d + 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const tx = interpolate(frame, [d, d + 8], [20, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    lineHeight: 1.7,
                    color: lineColor(l),
                    opacity: op,
                    transform: `translateX(${tx}px)`,
                    whiteSpace: "pre",
                    minHeight: l === "" ? 18 : undefined,
                  }}
                >
                  {l}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
