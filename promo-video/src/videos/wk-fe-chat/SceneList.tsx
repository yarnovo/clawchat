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

const REFS_CODE = `const containerRef = useRef<HTMLDivElement>(null);
const bottomRef = useRef<HTMLDivElement>(null);
const [isAtBottom, setIsAtBottom] = useState(true);`;

const SCROLL_DETECT_CODE = `useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight }
      = container;
    // 距底部 60px 内视为"在底部"
    setIsAtBottom(
      scrollHeight - scrollTop - clientHeight < 60
    );
  };

  container.addEventListener('scroll', handleScroll,
    { passive: true });
  return () => container.removeEventListener(
    'scroll', handleScroll);
}, []);`;

const AUTO_SCROLL_CODE = `// 新消息到达时自动滚动（仅在底部时）
useEffect(() => {
  if (isAtBottom) {
    bottomRef.current?.scrollIntoView(
      { behavior: 'smooth' }
    );
  }
}, [messages, isAtBottom]);`;

const FLOAT_BTN_CODE = `<button
  onClick={scrollToBottom}
  className={cn(
    'absolute bottom-4 left-1/2',
    'rounded-full border shadow-md',
    isAtBottom
      ? 'opacity-0 pointer-events-none'
      : 'opacity-100',
  )}
>
  <ArrowDown /> New messages
</button>`;

const scrollFlow = [
  { label: "useRef", desc: "跟踪容器 + 底部哨兵元素" },
  { label: "handleScroll", desc: "计算距底部距离，超过 60px 暂停" },
  { label: "scrollIntoView", desc: "新消息到达 + isAtBottom 时触发" },
  { label: "浮动按钮", desc: "不在底部时显示，点击回到底部" },
];

export const SceneList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 12, mass: 0.8 } });
  const refsProg = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const detectProg = spring({ frame: frame - 28, fps, config: { damping: 14 } });
  const autoProg = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  const floatProg = spring({ frame: frame - 68, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          flexDirection: "column",
          gap: 18,
          paddingTop: 40,
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
          message-list.tsx
          <span style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.muted, marginLeft: 16 }}>
            自动滚动管理
          </span>
        </div>

        {/* Refs row */}
        <div
          style={{
            width: "90%",
            maxWidth: 1600,
            opacity: interpolate(refsProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(refsProg, [0, 1], [16, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.accent,
              marginBottom: 6,
              letterSpacing: 1,
            }}
          >
            useRef + useState -- 跟踪滚动状态
          </div>
          <div
            style={{
              background: COLORS.card,
              border: `2px solid ${COLORS.accent}`,
              borderRadius: 12,
              boxShadow: COLORS.cardShadow,
              padding: "14px 22px",
            }}
          >
            <pre
              style={{
                fontFamily: MONO,
                fontSize: 16,
                lineHeight: 1.5,
                color: COLORS.text,
                margin: 0,
                whiteSpace: "pre",
              }}
            >
              {REFS_CODE}
            </pre>
          </div>
        </div>

        {/* Two-column: scroll detect + auto scroll + float btn */}
        <div
          style={{
            display: "flex",
            gap: 20,
            width: "90%",
            maxWidth: 1600,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {/* Left: scroll detection */}
          <div
            style={{
              flex: 1,
              opacity: interpolate(detectProg, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(detectProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                marginBottom: 6,
                letterSpacing: 1,
              }}
            >
              滚动检测
            </div>
            <div
              style={{
                background: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                boxShadow: COLORS.cardShadow,
                padding: "14px 18px",
              }}
            >
              <pre
                style={{
                  fontFamily: MONO,
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: COLORS.text,
                  margin: 0,
                  whiteSpace: "pre",
                }}
              >
                {SCROLL_DETECT_CODE}
              </pre>
            </div>
          </div>

          {/* Right: auto scroll + float button */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                opacity: interpolate(autoProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(autoProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                自动滚动
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "14px 18px",
                }}
              >
                <pre
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: COLORS.text,
                    margin: 0,
                    whiteSpace: "pre",
                  }}
                >
                  {AUTO_SCROLL_CODE}
                </pre>
              </div>
            </div>

            <div
              style={{
                opacity: interpolate(floatProg, [0, 1], [0, 1]),
                transform: `translateX(${interpolate(floatProg, [0, 1], [20, 0])}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_SANS,
                  fontSize: 16,
                  fontWeight: 600,
                  color: COLORS.accent,
                  marginBottom: 6,
                  letterSpacing: 1,
                }}
              >
                浮动按钮 -- 回到底部
              </div>
              <div
                style={{
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 12,
                  boxShadow: COLORS.cardShadow,
                  padding: "14px 18px",
                }}
              >
                <pre
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: COLORS.text,
                    margin: 0,
                    whiteSpace: "pre",
                  }}
                >
                  {FLOAT_BTN_CODE}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Flow summary */}
        <div
          style={{
            display: "flex",
            gap: 14,
            opacity: interpolate(floatProg, [0, 1], [0, 1]),
          }}
        >
          {scrollFlow.map((s, i) => {
            const tagDelay = 68 + i * 6;
            const tagProg = spring({
              frame: frame - tagDelay,
              fps,
              config: { damping: 14, mass: 0.5 },
            });
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: interpolate(tagProg, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tagProg, [0, 1], [0.8, 1])})`,
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    color: COLORS.accent,
                    padding: "4px 12px",
                    background: `${COLORS.accent}11`,
                    borderRadius: 16,
                    border: `1px solid ${COLORS.accent}30`,
                  }}
                >
                  {s.label}
                </div>
                {i < scrollFlow.length - 1 && (
                  <div style={{ fontFamily: MONO, fontSize: 18, color: COLORS.subtle }}>
                    &rarr;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
