import { Composition, Folder } from "remotion";
import { Main, TOTAL_FRAMES as MAIN_FRAMES } from "./videos/main/Main";
import { Backup, TOTAL_FRAMES as BACKUP_FRAMES } from "./videos/backup/Backup";
import { Db, TOTAL_FRAMES as DB_FRAMES } from "./videos/db/Db";
import { Skills, TOTAL_FRAMES as SKILLS_FRAMES } from "./videos/skills/Skills";
import { Registry, TOTAL_FRAMES as REGISTRY_FRAMES } from "./videos/registry/Registry";
import { Marketplace, TOTAL_FRAMES as MARKETPLACE_FRAMES } from "./videos/marketplace/Marketplace";
import { AgentDb, TOTAL_FRAMES as AGENTDB_FRAMES } from "./videos/agent-db/AgentDb";
import { SkillTutorial, TOTAL_FRAMES as SKILLTUT_FRAMES } from "./videos/skill-tutorial/SkillTutorial";
import { SkillDevwalk, TOTAL_FRAMES as SKILLDEV_FRAMES } from "./videos/skill-devwalk/SkillDevwalk";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="宣传">
        <Composition
          id="Main"
          component={Main}
          durationInFrames={MAIN_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Skills"
          component={Skills}
          durationInFrames={SKILLS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Marketplace"
          component={Marketplace}
          durationInFrames={MARKETPLACE_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="教程">
        <Composition
          id="SkillTutorial"
          component={SkillTutorial}
          durationInFrames={SKILLTUT_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="科普">
        <Composition
          id="Db"
          component={Db}
          durationInFrames={DB_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Backup"
          component={Backup}
          durationInFrames={BACKUP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Registry"
          component={Registry}
          durationInFrames={REGISTRY_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="AgentDb"
          component={AgentDb}
          durationInFrames={AGENTDB_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="开发">
        <Composition
          id="SkillDevwalk"
          component={SkillDevwalk}
          durationInFrames={SKILLDEV_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
