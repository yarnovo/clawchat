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

type RiskLevel = "high" | "mid" | "low";

interface CaseLayoutProps {
  category: string;
  clauseTitle: string;
  clauseText: string;
  riskLevel: RiskLevel;
  issue: string;
  legalBasis: string;
  suggestion: string;
}

const riskConfig: Record<RiskLevel, { label: string; color: string }> = {
  high: { label: "高风险", color: COLORS.accent },
  mid: { label: "中风险", color: "#B8860B" },
  low: { label: "低风险", color: COLORS.muted },
};

export const CaseLayout: React.FC<CaseLayoutProps> = ({
  category,
  clauseTitle,
  clauseText,
  riskLevel,
  issue,
  legalBasis,
  suggestion,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });

  // Left side (contract clause)
  const leftEnt = spring({ frame: frame - 10, fps, config: { damping: 14, mass: 0.7 } });
  // Right side (AI analysis)
  const rightEnt = spring({ frame: frame - 25, fps, config: { damping: 14, mass: 0.7 } });
  // Risk badge pop
  const badgeProg = spring({ frame: frame - 35, fps, config: { damping: 10, mass: 0.6 } });

  const risk = riskConfig[riskLevel];

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
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        {/* Category + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              padding: "6px 16px",
              borderRadius: 6,
              border: `1px solid ${COLORS.border}`,
              background: COLORS.card,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: 48,
              fontWeight: 700,
              color: COLORS.text,
              opacity: interpolate(titleProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(titleProg, [0, 1], [-20, 0])}px)`,
            }}
          >
            {clauseTitle}
          </div>
        </div>

        {/* Two column layout */}
        <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 1600 }}>
          {/* Left: Contract clause */}
          <div
            style={{
              flex: 1,
              padding: "28px 32px",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${COLORS.subtle}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(leftEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(leftEnt, [0, 1], [-30, 0])}px)`,
            }}
          >
            <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle, marginBottom: 12 }}>
              合同原文
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 28,
                color: COLORS.text,
                lineHeight: 1.8,
                whiteSpace: "pre-line",
              }}
            >
              {clauseText}
            </div>
          </div>

          {/* Right: AI Analysis */}
          <div
            style={{
              flex: 1,
              padding: "28px 32px",
              background: COLORS.card,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `4px solid ${risk.color}`,
              boxShadow: COLORS.cardShadow,
              opacity: interpolate(rightEnt, [0, 1], [0, 1]),
              transform: `translateX(${interpolate(rightEnt, [0, 1], [30, 0])}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 22, color: COLORS.subtle }}>
                AI 审查意见
              </div>
              {/* Risk badge */}
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 20,
                  fontWeight: 700,
                  color: COLORS.card,
                  background: risk.color,
                  padding: "4px 14px",
                  borderRadius: 6,
                  transform: `scale(${badgeProg})`,
                }}
              >
                {risk.label}
              </div>
            </div>

            {/* Issue */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>问题</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text, lineHeight: 1.6 }}>
                {issue}
              </div>
            </div>

            {/* Legal basis */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>法律依据</div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 24,
                  color: COLORS.accent,
                  background: COLORS.bg,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {legalBasis}
              </div>
            </div>

            {/* Suggestion */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: FONT_SANS, fontSize: 20, color: COLORS.subtle }}>建议</div>
              <div style={{ fontFamily: FONT_SANS, fontSize: 26, color: COLORS.text, lineHeight: 1.6 }}>
                {suggestion}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
