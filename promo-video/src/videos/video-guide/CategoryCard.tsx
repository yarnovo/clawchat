import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientBg } from "../../GradientBg";
import { Particles } from "../../Particles";
import { COLORS, FONT, FONT_SANS } from "../../constants";

interface ExampleItem {
  icon: string;
  title: string;
}

interface CategoryCardProps {
  number: number;
  category: string;
  verb: string;
  description: string;
  examples: ExampleItem[];
  accentVerb?: boolean;
  note?: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  number,
  category,
  verb,
  description,
  examples,
  accentVerb = false,
  note,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 15 } });
  const titleY = interpolate(titleProg, [0, 1], [-40, 0]);

  const noteProg = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14 },
  });

  return (
    <AbsoluteFill>
      <GradientBg />
      <Particles />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 44,
          paddingBottom: 140,
        }}
      >
        {/* Title: category badge + verb */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${titleY}px)`,
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: COLORS.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT_SANS,
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.white,
              }}
            >
              {number}
            </div>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontSize: 26,
                fontWeight: 500,
                color: COLORS.muted,
                letterSpacing: 4,
              }}
            >
              {category}
            </div>
          </div>

          {/* Hero verb */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 72,
              fontWeight: 700,
              color: accentVerb ? COLORS.accent : COLORS.text,
            }}
          >
            {verb}
          </div>

          {/* Description */}
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 28,
              color: COLORS.muted,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        </div>

        {/* Example cards */}
        <div style={{ display: "flex", gap: 32 }}>
          {examples.map((ex, i) => {
            const delay = 15 + i * 12;
            const ent = spring({
              frame: frame - delay,
              fps,
              config: { damping: 14, mass: 0.8 },
            });

            return (
              <div
                key={ex.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  padding: "28px 32px",
                  background: COLORS.card,
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`,
                  minWidth: 200,
                  opacity: interpolate(ent, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(ent, [0, 1], [0.85, 1])})`,
                  boxShadow: COLORS.cardShadow,
                }}
              >
                <div style={{ fontSize: 48 }}>{ex.icon}</div>
                <div
                  style={{
                    fontFamily: FONT,
                    fontSize: 24,
                    fontWeight: 700,
                    color: COLORS.text,
                    textAlign: "center",
                  }}
                >
                  {ex.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Optional note */}
        {note && (
          <div
            style={{
              fontFamily: FONT_SANS,
              fontSize: 24,
              color: COLORS.muted,
              borderLeft: `3px solid ${COLORS.accent}`,
              paddingLeft: 16,
              opacity: interpolate(noteProg, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(noteProg, [0, 1], [15, 0])}px)`,
            }}
          >
            {note}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
