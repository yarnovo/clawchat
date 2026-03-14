import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneBackupCover } from "./SceneBackupCover";
import { SceneBackupRisks } from "./SceneBackupRisks";
import { SceneBackupAnalogy } from "./SceneBackupAnalogy";
import { SceneBackupOverview } from "./SceneBackupOverview";
import { SceneBackupDaily } from "./SceneBackupDaily";
import { SceneBackupDeploy } from "./SceneBackupDeploy";
import { SceneBackupRedis } from "./SceneBackupRedis";
import { SceneBackupCommands } from "./SceneBackupCommands";
import { SceneBackupRestore } from "./SceneBackupRestore";
import { SceneBackupOutro } from "./SceneBackupOutro";
import { Subtitle } from "../../Subtitle";

import coverWords from "./words/backup-cover-words.json";
import risksWords from "./words/backup-risks-words.json";
import analogyWords from "./words/backup-analogy-words.json";
import overviewWords from "./words/backup-overview-words.json";
import dailyWords from "./words/backup-daily-words.json";
import deployWords from "./words/backup-deploy-words.json";
import redisWords from "./words/backup-redis-words.json";
import commandsWords from "./words/backup-commands-words.json";
import restoreWords from "./words/backup-restore-words.json";
import outroWords from "./words/backup-outro-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [
  SceneBackupCover, SceneBackupRisks, SceneBackupAnalogy,
  SceneBackupOverview, SceneBackupDaily, SceneBackupDeploy,
  SceneBackupRedis, SceneBackupCommands, SceneBackupRestore, SceneBackupOutro,
];
const SCENE_WORDS = [
  coverWords, risksWords, analogyWords, overviewWords, dailyWords,
  deployWords, redisWords, commandsWords, restoreWords, outroWords,
];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  const endFrame = isLast
    ? Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD
    : Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;

  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i] };
});

export const TOTAL_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const Backup: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0f0c29" }}>
    <Audio src={staticFile("audio/backup/backup.mp3")} volume={0.9} />
    {scenes.map((s, i) => {
      const isLast = i === scenes.length - 1;
      const seqDur = isLast ? s.dur : s.dur + FADE;
      const sceneStartMs = (s.from / FPS) * 1000;
      return (
        <Sequence key={i} from={s.from} durationInFrames={seqDur}>
          <Scene dur={seqDur} isLast={isLast}>
            <s.Comp />
            <AbsoluteFill style={{ zIndex: 100 }}>
              <Subtitle words={s.words as any} offsetMs={sceneStartMs} />
            </AbsoluteFill>
          </Scene>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
