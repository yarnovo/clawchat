import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneDeployIntro } from "./SceneDeployIntro";
import { SceneDeployCicd } from "./SceneDeployCicd";
import { SceneDeployDocker } from "./SceneDeployDocker";
import { SceneDeployNginx } from "./SceneDeployNginx";
import { SceneDeployDb } from "./SceneDeployDb";
import { SceneDeployOutro } from "./SceneDeployOutro";
import { Subtitle } from "../../Subtitle";

import deployIntroWords from "./words/deploy-intro-words.json";
import deployCicdWords from "./words/deploy-cicd-words.json";
import deployDockerWords from "./words/deploy-docker-words.json";
import deployNginxWords from "./words/deploy-nginx-words.json";
import deployDbWords from "./words/deploy-db-words.json";
import deployOutroWords from "./words/deploy-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneDeployIntro, SceneDeployCicd, SceneDeployDocker, SceneDeployNginx, SceneDeployDb, SceneDeployOutro];
const SCENE_WORDS = [deployIntroWords, deployCicdWords, deployDockerWords, deployNginxWords, deployDbWords, deployOutroWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) { endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD; }
  else { const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD; endFrame = nextStart; }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i], startMs: t.startMs };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Deploy: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
      <Audio src={staticFile("audio/deploy/deploy.mp3")} volume={0.9} />
      {scenes.map((s, i) => {
        const isLast = i === scenes.length - 1;
        const seqDur = isLast ? s.dur : s.dur + FADE;
        const sceneStartMs = (s.from / FPS) * 1000;
        return (
          <Sequence key={i} from={s.from} durationInFrames={seqDur}>
            <Scene dur={seqDur} isLast={isLast}>
              <s.Comp />
              <AbsoluteFill style={{ zIndex: 100 }}><Subtitle words={s.words as any} offsetMs={sceneStartMs} /></AbsoluteFill>
            </Scene>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
