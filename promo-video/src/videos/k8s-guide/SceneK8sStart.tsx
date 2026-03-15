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

const steps = [
  {
    num: "1",
    title: "本地装 K8s",
    cmd: "minikube start",
    desc: "minikube 或 Docker Desktop K8s",
  },
  {
    num: "2",
    title: "写 Deployment",
    cmd: "kubectl apply -f deploy.yaml",
    desc: "管理 Pod 数量和镜像版本",
  },
  {
    num: "3",
    title: "加 Service",
    cmd: "kubectl expose deploy ...",
    desc: "暴露端口，外部可访问",
  },
];

export const SceneK8sStart: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProg = spring({ frame, fps, config: { damping: 14 } });

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
        <div
          style={{
            fontFamily: FONT,
            fontSize: 52,
            fontWeight: 700,
            color: COLORS.text,
            opacity: interpolate(titleProg, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProg, [0, 1], [-30, 0])}px)`,
          }}
        >
          三步开始
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 8 }}>
          {steps.map((s, i) => {
            const delay = 12 + i * 12;
            const prog = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
            return (
              <div
                key={s.num}
                style={{
                  width: 360,
                  padding: "32px 28px",
                  borderRadius: 16,
                  background: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: COLORS.cardShadow,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  alignItems: "center",
                  opacity: interpolate(prog, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(prog, [0, 1], [40, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: COLORS.accent,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontFamily: FONT_SANS,
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.white,
                  }}
                >
                  {s.num}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 30,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    color: COLORS.accent,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "#FAF9F6",
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {s.cmd}
                </div>
                <div
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 24,
                    color: COLORS.muted,
                    textAlign: "center",
                    lineHeight: 1.5,
                  }}
                >
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
