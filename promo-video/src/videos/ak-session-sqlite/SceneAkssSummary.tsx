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

/**
 * Scene 2: Docker container with embedded DB, "docker commit" arrow to cloned container.
 * Message: "记忆跟着容器走"
 */
export const SceneAkssSummary: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* --- Animations --- */
  const containerProg = spring({ frame, fps, config: { damping: 12, mass: 0.7 } });
  const dbInsideProg = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  const arrowProg = spring({ frame: frame - 35, fps, config: { damping: 12 } });
  const cloneProg = spring({ frame: frame - 55, fps, config: { damping: 12, mass: 0.6 } });
  const messageProg = spring({ frame: frame - 75, fps, config: { damping: 14 } });

  /* Arrow pulse */
  const arrowShift = interpolate(frame % 50, [0, 25, 50], [0, 8, 0]);

  const CONTAINER_W = 280;
  const CONTAINER_H = 260;
  const CONTAINER_R = 16;

  /* Reusable Docker container card */
  const DockerContainer: React.FC<{
    opacity: number;
    scale: number;
    showDb: boolean;
    dbOpacity: number;
  }> = ({ opacity, scale, showDb, dbOpacity }) => (
    <div
      style={{
        width: CONTAINER_W,
        height: CONTAINER_H,
        borderRadius: CONTAINER_R,
        border: `2.5px solid ${COLORS.border}`,
        background: COLORS.card,
        boxShadow: COLORS.cardShadow,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity,
        transform: `scale(${scale})`,
        position: "relative",
      }}
    >
      {/* Docker whale icon (simplified) */}
      <svg width="56" height="44" viewBox="0 0 56 44">
        {/* Whale body */}
        <rect x="4" y="14" width="48" height="26" rx="6" fill={COLORS.bg} stroke={COLORS.border} strokeWidth="1.5" />
        {/* Container blocks (3x2 grid) */}
        {[0, 1, 2].map((col) =>
          [0, 1].map((row) => (
            <rect
              key={`${col}-${row}`}
              x={10 + col * 15}
              y={18 + row * 10}
              width={12}
              height={7}
              rx={1.5}
              fill={col === 1 && row === 0 ? COLORS.accent : COLORS.subtle}
              opacity={0.7}
            />
          )),
        )}
        {/* Whale spout */}
        <path d="M 28 14 Q 28 4, 36 2" stroke={COLORS.subtle} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="36" cy="2" r="2" fill={COLORS.subtle} />
      </svg>

      {/* "Agent" label */}
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: 1,
        }}
      >
        Agent
      </div>

      {/* Embedded DB icon */}
      {showDb && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: 10,
            background: COLORS.bg,
            border: `1.5px dashed ${COLORS.border}`,
            opacity: dbOpacity,
            transform: `scale(${interpolate(dbOpacity, [0, 1], [0.8, 1])})`,
          }}
        >
          {/* Mini DB icon */}
          <svg width="28" height="34" viewBox="0 0 28 34">
            <ellipse cx="14" cy="8" rx="12" ry="6" fill={COLORS.bg} stroke={COLORS.accent} strokeWidth="1.5" />
            <rect x="2" y="8" width="24" height="18" fill={COLORS.bg} stroke="none" />
            <line x1="2" y1="8" x2="2" y2="26" stroke={COLORS.accent} strokeWidth="1.5" />
            <line x1="26" y1="8" x2="26" y2="26" stroke={COLORS.accent} strokeWidth="1.5" />
            <ellipse cx="14" cy="26" rx="12" ry="6" fill={COLORS.bg} stroke={COLORS.accent} strokeWidth="1.5" />
          </svg>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 18,
              fontWeight: 600,
              color: COLORS.accent,
            }}
          >
            session.db
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 36,
          paddingBottom: 140,
        }}
      >
        {/* Container row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          {/* Original container */}
          <DockerContainer
            opacity={interpolate(containerProg, [0, 1], [0, 1])}
            scale={interpolate(containerProg, [0, 1], [0.8, 1])}
            showDb={dbInsideProg > 0.1}
            dbOpacity={interpolate(dbInsideProg, [0, 1], [0, 1])}
          />

          {/* Arrow: docker commit */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              opacity: interpolate(arrowProg, [0, 1], [0, 1]),
            }}
          >
            <svg width="140" height="40" viewBox="0 0 140 40">
              <path
                d={`M 0 20 L ${100 + arrowShift} 20`}
                stroke={COLORS.accent}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray="8 4"
              />
              <polygon
                points={`${104 + arrowShift},12 ${120 + arrowShift},20 ${104 + arrowShift},28`}
                fill={COLORS.accent}
              />
            </svg>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.accent,
                whiteSpace: "nowrap",
                background: COLORS.card,
                padding: "4px 14px",
                borderRadius: 8,
                border: `1px solid ${COLORS.border}`,
                boxShadow: COLORS.cardShadow,
              }}
            >
              docker commit
            </div>
          </div>

          {/* Cloned container */}
          <DockerContainer
            opacity={interpolate(cloneProg, [0, 1], [0, 1])}
            scale={interpolate(cloneProg, [0, 1], [0.7, 1])}
            showDb={cloneProg > 0.5}
            dbOpacity={interpolate(cloneProg, [0, 1], [0, 1])}
          />
        </div>

        {/* Bottom message */}
        <div
          style={{
            fontFamily: FONT,
            fontSize: 36,
            fontWeight: 600,
            color: COLORS.muted,
            letterSpacing: 2,
            opacity: interpolate(messageProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(messageProg, [0, 1], [20, 0])}px)`,
          }}
        >
          记忆跟着容器走
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
