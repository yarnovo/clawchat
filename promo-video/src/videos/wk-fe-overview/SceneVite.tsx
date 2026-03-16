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

const VITE_CODE = `import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})`;

const annotations = [
  { label: "1. Plugins", desc: "React + Tailwind CSS 插件", top: 170 },
  { label: "2. Alias", desc: "@ → src/ 路径映射", top: 300 },
  { label: "3. Proxy", desc: "/api → localhost:4000 转发", top: 440 },
];

export const SceneVite: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 20,
          paddingTop: 50,
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
            letterSpacing: -1,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-16, 0])}px)`,
          }}
        >
          vite.config.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            3 key configs
          </span>
        </div>

        {/* Content: code + annotations */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "90%",
            maxWidth: 1600,
            alignItems: "flex-start",
          }}
        >
          {/* Code */}
          <div
            style={{
              flex: 2,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "24px 32px",
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(codeProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 20,
                lineHeight: 1.55,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {VITE_CODE}
            </pre>
          </div>

          {/* Annotations */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {annotations.map((a, i) => {
              const delay = 25 + i * 12;
              const aProg = spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, mass: 0.6 },
              });
              return (
                <div
                  key={a.label}
                  style={{
                    background: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    boxShadow: COLORS.cardShadow,
                    padding: "20px 24px",
                    opacity: interpolate(aProg, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(aProg, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 22,
                      fontWeight: 700,
                      color: COLORS.accent,
                      marginBottom: 8,
                    }}
                  >
                    {a.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.muted,
                      lineHeight: 1.5,
                    }}
                  >
                    {a.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
