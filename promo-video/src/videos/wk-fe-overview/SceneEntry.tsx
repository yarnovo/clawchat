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

const MAIN_CODE = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)`;

const APP_CODE = `import { Outlet } from '@tanstack/react-router'

export default function App() {
  return <Outlet />
}`;

const keyPoints = [
  "RouterProvider 驱动整个应用",
  "App 只渲染 <Outlet />",
  "路由懒加载，首屏最小化",
];

export const SceneEntry: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const mainProg = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const appProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const pointsProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });

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
          Entry Files
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            main.tsx + App.tsx
          </span>
        </div>

        {/* Side by side code */}
        <div
          style={{
            display: "flex",
            gap: 24,
            width: "90%",
            maxWidth: 1600,
            alignItems: "flex-start",
          }}
        >
          {/* main.tsx */}
          <div
            style={{
              flex: 3,
              opacity: interpolate(mainProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(mainProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              main.tsx -- 11 lines
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 28px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 19,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {MAIN_CODE}
              </pre>
            </div>
          </div>

          {/* App.tsx */}
          <div
            style={{
              flex: 2,
              opacity: interpolate(appProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(appProg, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              App.tsx -- 5 lines
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 28px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 19,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {APP_CODE}
              </pre>
            </div>

            {/* Key points */}
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                opacity: interpolate(pointsProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(pointsProg, [0, 1], [12, 0])}px)`,
              }}
            >
              {keyPoints.map((p, i) => {
                const delay = 50 + i * 8;
                const pProg = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 14, mass: 0.5 },
                });
                return (
                  <div
                    key={p}
                    style={{
                      fontFamily: FONT_SANS,
                      fontSize: 20,
                      color: COLORS.text,
                      padding: "10px 18px",
                      background: COLORS.card,
                      borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      boxShadow: COLORS.cardShadow,
                      opacity: interpolate(pProg, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(pProg, [0, 1], [16, 0])}px)`,
                    }}
                  >
                    <span style={{ color: COLORS.accent, marginRight: 8 }}>&#x2022;</span>
                    {p}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
