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

const FULL_CODE = `export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  theme: (localStorage.getItem('theme') as Theme)
         ?? 'system',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) =>
    set({ sidebarOpen: open }),

  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    set({ theme })
  },
}))`;

const stateFields = [
  { name: "sidebarOpen", type: "boolean", init: "true", desc: "侧边栏默认展开" },
  { name: "theme", type: "Theme", init: "localStorage ?? 'system'", desc: "三选一：light | dark | system" },
];

const actions = [
  { name: "toggleSidebar", desc: "取反 sidebarOpen" },
  { name: "setSidebarOpen", desc: "直接设值" },
  { name: "setTheme", desc: "写 localStorage + set state" },
];

export const SceneUiStore: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const codeProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const fieldsProg = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const actionsProg = spring({ frame: frame - 55, fps, config: { damping: 14 } });

  const pulseOpacity = interpolate(
    frame % 60,
    [0, 30, 60],
    [0.12, 0.3, 0.12],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 24,
          paddingTop: 44,
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
          ui-store.ts
          <span style={{ fontFamily: FONT_SANS, fontSize: 24, color: COLORS.muted, marginLeft: 16 }}>
            28 lines
          </span>
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "flex",
            gap: 32,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: Full code */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(codeProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(codeProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              完整实现
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "20px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Highlight on setTheme localStorage line */}
              <div
                style={{
                  position: "absolute",
                  top: 250,
                  left: 0,
                  right: 0,
                  height: 22,
                  background: COLORS.accent,
                  opacity: pulseOpacity,
                  borderRadius: 4,
                }}
              />
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                  position: "relative",
                }}
              >
                {FULL_CODE}
              </pre>
            </div>
          </div>

          {/* Right: Fields + Actions */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* State fields */}
            <div
              style={{
                opacity: interpolate(fieldsProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(fieldsProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                State -- 两个字段
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stateFields.map((f, i) => {
                  const delay = 30 + i * 10;
                  const fProg = spring({
                    frame: frame - delay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });
                  return (
                    <div
                      key={f.name}
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        boxShadow: COLORS.cardShadow,
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        opacity: interpolate(fProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(fProg, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: COLORS.text, minWidth: 160 }}>
                        {f.name}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 15, color: COLORS.subtle }}>
                        {f.type}
                      </div>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.muted, marginLeft: "auto" }}>
                        {f.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                opacity: interpolate(actionsProg, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(actionsProg, [0, 1], [16, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 18,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 10,
                  letterSpacing: 1,
                }}
              >
                Actions -- 三个方法
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {actions.map((a, i) => {
                  const delay = 55 + i * 8;
                  const aProg = spring({
                    frame: frame - delay,
                    fps,
                    config: { damping: 14, mass: 0.6 },
                  });
                  return (
                    <div
                      key={a.name}
                      style={{
                        background: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 10,
                        boxShadow: COLORS.cardShadow,
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        opacity: interpolate(aProg, [0, 1], [0, 1]),
                        transform: `translateX(${interpolate(aProg, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: COLORS.text, minWidth: 180 }}>
                        {a.name}
                      </div>
                      <div style={{ fontFamily: FONT_SANS, fontSize: 16, color: COLORS.muted }}>
                        {a.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Persistence note */}
            <div
              style={{
                opacity: interpolate(
                  spring({ frame: frame - 80, fps, config: { damping: 14 } }),
                  [0, 1],
                  [0, 1]
                ),
                fontFamily: FONT_SANS,
                fontSize: 20,
                color: COLORS.accent,
                padding: "12px 24px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.card,
                boxShadow: COLORS.cardShadow,
                textAlign: "center",
              }}
            >
              setTheme 写 localStorage → 页面刷新后主题恢复
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
