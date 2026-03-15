import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { SceneAkdgIntro } from "./SceneAkdgIntro";
import { SceneAkdgProviderLlm } from "./SceneAkdgProviderLlm";
import { SceneAkdgProviderSession } from "./SceneAkdgProviderSession";
import { SceneAkdgChannel } from "./SceneAkdgChannel";
import { SceneAkdgExtension } from "./SceneAkdgExtension";
import { SceneAkdgAssemble } from "./SceneAkdgAssemble";
import { SceneAkdgSummary } from "./SceneAkdgSummary";
import { Subtitle } from "../../Subtitle";

import introWords from "./words/akdg-intro-words.json";
import providerLlmWords from "./words/akdg-provider-llm-words.json";
import providerSessionWords from "./words/akdg-provider-session-words.json";
import channelWords from "./words/akdg-channel-words.json";
import extensionWords from "./words/akdg-extension-words.json";
import assembleWords from "./words/akdg-assemble-words.json";
import summaryWords from "./words/akdg-summary-words.json";
import timingData from "./timing.json";

const FPS = 30;
const FADE = 15;
const INTRO_PAD = 10;
const OUTRO_PAD = 30;

const SCENE_COMPS = [SceneAkdgIntro, SceneAkdgProviderLlm, SceneAkdgProviderSession, SceneAkdgChannel, SceneAkdgExtension, SceneAkdgAssemble, SceneAkdgSummary];
const SCENE_WORDS = [introWords, providerLlmWords, providerSessionWords, channelWords, extensionWords, assembleWords, summaryWords];

const scenes = timingData.map((t, i) => {
  const startFrame = Math.max(0, Math.round((t.startMs / 1000) * FPS) - INTRO_PAD);
  const isLast = i === timingData.length - 1;
  let endFrame: number;
  if (isLast) {
    endFrame = Math.round((t.endMs / 1000) * FPS) + OUTRO_PAD;
  } else {
    const nextStart = Math.round((timingData[i + 1].startMs / 1000) * FPS) - INTRO_PAD;
    endFrame = nextStart;
  }
  return { from: startFrame, dur: endFrame - startFrame, words: SCENE_WORDS[i], Comp: SCENE_COMPS[i] };
});

export const AK_DEV_GUIDE_FRAMES = scenes[scenes.length - 1].from + scenes[scenes.length - 1].dur;

const Scene: React.FC<{ children: React.ReactNode; dur: number; isLast?: boolean }> = ({ children, dur, isLast }) => {
  const frame = useCurrentFrame();
  const opacity = isLast ? 1 : interpolate(frame, [dur - FADE, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const AkDevGuide: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#FAF9F6" }}>
    <Audio src={staticFile("audio/ak-dev-guide/ak-dev-guide.mp3")} volume={0.9} />
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
