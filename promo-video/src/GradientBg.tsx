import { AbsoluteFill } from "remotion";
import { COLORS } from "./constants";

/**
 * 温暖奶油白背景 + 极淡纹理
 */
export const GradientBg: React.FC<{
  colors?: [string, string, string];
}> = () => {
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: COLORS.bg }} />
      {/* 极淡的纸张纹理 */}
      <AbsoluteFill
        style={{
          background:
            "repeating-conic-gradient(rgba(0,0,0,0.01) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px",
          opacity: 0.3,
        }}
      />
    </AbsoluteFill>
  );
};
