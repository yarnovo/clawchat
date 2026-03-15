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
import { Architecture, TOTAL_FRAMES as ARCH_FRAMES } from "./videos/architecture/Architecture";
import { Saga, TOTAL_FRAMES as SAGA_FRAMES } from "./videos/saga/Saga";
import { Runtime, TOTAL_FRAMES as RUNTIME_FRAMES } from "./videos/runtime/Runtime";
import { Testing, TOTAL_FRAMES as TESTING_FRAMES } from "./videos/testing/Testing";
import { AgentPromo, TOTAL_FRAMES as AGENTPROMO_FRAMES } from "./videos/agent-promo/AgentPromo";
import { QuickStart, TOTAL_FRAMES as QS_FRAMES } from "./videos/quickstart/QuickStart";
import { MessageSystem, TOTAL_FRAMES as MSG_FRAMES } from "./videos/message-system/MessageSystem";
import { ImServerWalk, TOTAL_FRAMES as IMW_FRAMES } from "./videos/im-server-walk/ImServerWalk";
import { AgentServerWalk, TOTAL_FRAMES as ASW_FRAMES } from "./videos/agent-server-walk/AgentServerWalk";
import { ContainerWalk, TOTAL_FRAMES as CW_FRAMES } from "./videos/container-walk/ContainerWalk";
import { OpenclawVolume, TOTAL_FRAMES as OV_FRAMES } from "./videos/openclaw-volume/OpenclawVolume";
import { Deploy, TOTAL_FRAMES as DEPLOY_FRAMES } from "./videos/deploy/Deploy";
import { Business, TOTAL_FRAMES as BIZ_FRAMES } from "./videos/business/Business";
import { Security, TOTAL_FRAMES as SEC_FRAMES } from "./videos/security/Security";
import { AccountSystem, TOTAL_FRAMES as ACCT_FRAMES } from "./videos/account-system/AccountSystem";
import { WebSocketVideo, TOTAL_FRAMES as WS_FRAMES } from "./videos/websocket/WebSocketVideo";
import { CrossPlatform, TOTAL_FRAMES as CP_FRAMES } from "./videos/cross-platform/CrossPlatform";
import { FriendTutorial, TOTAL_FRAMES as FT_FRAMES } from "./videos/friend-tutorial/FriendTutorial";
import { AgentConfig, TOTAL_FRAMES as AC_FRAMES } from "./videos/agent-config/AgentConfig";
import { Roadmap, TOTAL_FRAMES as RM_FRAMES } from "./videos/roadmap/Roadmap";
import { Container, TOTAL_FRAMES as CONTAINER_FRAMES } from "./videos/container/Container";
import { Vision, TOTAL_FRAMES as VIS_FRAMES } from "./videos/vision/Vision";
import { TechStack, TOTAL_FRAMES as TS_FRAMES } from "./videos/tech-stack/TechStack";
import { ErrorHandling, TOTAL_FRAMES as EH_FRAMES } from "./videos/error-handling/ErrorHandling";
import { Mcp, TOTAL_FRAMES as MCP_FRAMES } from "./videos/mcp/Mcp";
import { OpenSource, TOTAL_FRAMES as OS_FRAMES } from "./videos/open-source/OpenSource";
import { SkillBrowserVideo, TOTAL_FRAMES as SB_FRAMES } from "./videos/skill-browser/SkillBrowserVideo";
import { OpenclawPlugin, TOTAL_FRAMES as OP_FRAMES } from "./videos/openclaw-plugin/OpenclawPlugin";
import { VolumeSafety, TOTAL_FRAMES as VS_FRAMES } from "./videos/volume-safety/VolumeSafety";
import { PainPoints, TOTAL_FRAMES as PP_FRAMES } from "./videos/pain-points/PainPoints";
import { ShareSaga, TOTAL_FRAMES as SSAGA_FRAMES } from "./videos/share-saga/ShareSaga";
import { ShareVolume, TOTAL_FRAMES as SVOL_FRAMES } from "./videos/share-volume/ShareVolume";
import { InvestorPitch, TOTAL_FRAMES as INVESTOR_FRAMES } from "./videos/investor-pitch/InvestorPitch";
import { VideoGuide, TOTAL_FRAMES as VG_FRAMES } from "./videos/video-guide/VideoGuide";
import { OpenclawMemory, TOTAL_FRAMES as OCMEM_FRAMES } from "./videos/openclaw-memory/OpenclawMemory";
import { DevSetup, TOTAL_FRAMES as DXSETUP_FRAMES } from "./videos/dev-setup/DevSetup";
import { RuntimeBattle, TOTAL_FRAMES as RB_FRAMES } from "./videos/runtime-battle/RuntimeBattle";
import { SecurityFaceoff, TOTAL_FRAMES as SF_FRAMES } from "./videos/security-faceoff/SecurityFaceoff";
import { StateMemory, TOTAL_FRAMES as SM_FRAMES } from "./videos/state-memory/StateMemory";
import { BizOpportunities, TOTAL_FRAMES as BIZOP_FRAMES } from "./videos/biz-opportunities/BizOpportunities";
import { NanoClawGuide, TOTAL_FRAMES as NCG_FRAMES } from "./videos/nanoclaw-guide/NanoClawGuide";
import { AgentAgency, TOTAL_FRAMES as AAGENCY_FRAMES } from "./videos/agent-agency/AgentAgency";
import { AgentMarket, TOTAL_FRAMES as AMKT_FRAMES } from "./videos/agent-market/AgentMarket";
import { SeedAgents, TOTAL_FRAMES as SA_FRAMES } from "./videos/seed-agents/SeedAgents";
import { CoreTools, TOTAL_FRAMES as CT_FRAMES } from "./videos/core-tools/CoreTools";
import { K8sGuide, TOTAL_FRAMES as K8S_FRAMES } from "./videos/k8s-guide/K8sGuide";
import { K8sDeploy, TOTAL_FRAMES as K8SDEPLOY_FRAMES } from "./videos/k8s-deploy/K8sDeploy";
import { TechArch, TOTAL_FRAMES as TECHARCH_FRAMES } from "./videos/tech-arch/TechArch";
import { AiTrends2026, TOTAL_FRAMES as AITRENDS_FRAMES } from "./videos/ai-trends-2026/AiTrends2026";
import { AkAgentic, AK_AGENTIC_FRAMES } from "./videos/ak-agentic/AkAgentic";
import { AkCore, AK_CORE_FRAMES } from "./videos/ak-core/AkCore";
import { AkProviderOpenai, AK_PROVIDER_OPENAI_FRAMES } from "./videos/ak-provider-openai/AkProviderOpenai";
import { AkEventLoop, AK_EVENT_LOOP_FRAMES } from "./videos/ak-event-loop/AkEventLoop";
import { AkEval, AK_EVAL_FRAMES } from "./videos/ak-eval/AkEval";
import { AkCli, AK_CLI_FRAMES } from "./videos/ak-cli/AkCli";
import { AkExtensionGuide, AK_EXTENSION_GUIDE_FRAMES } from "./videos/ak-extension-guide/AkExtensionGuide";
import { AkDevGuide, AK_DEV_GUIDE_FRAMES } from "./videos/ak-dev-guide/AkDevGuide";
// Walkthrough videos
import { WkCore, WK_CORE_FRAMES } from "./videos/wk-core/WkCore";
import { WkEventLoop, WK_EVENT_LOOP_FRAMES } from "./videos/wk-event-loop/WkEventLoop";
import { WkAgentic, WK_AGENTIC_FRAMES } from "./videos/wk-agentic/WkAgentic";
import { WkProviderLlm, WK_PROVIDER_LLM_FRAMES } from "./videos/wk-provider-llm/WkProviderLlm";
import { WkProviderSession, WK_PROVIDER_SESSION_FRAMES } from "./videos/wk-provider-session/WkProviderSession";
import { WkExtSkills, WK_EXT_SKILLS_FRAMES } from "./videos/wk-ext-skills/WkExtSkills";
import { WkExtMemory, WK_EXT_MEMORY_FRAMES } from "./videos/wk-ext-memory/WkExtMemory";
import { WkChHttp, WK_CH_HTTP_FRAMES } from "./videos/wk-ch-http/WkChHttp";
import { WkChScheduler, WK_CH_SCHEDULER_FRAMES } from "./videos/wk-ch-scheduler/WkChScheduler";
import { WkEval, WK_EVAL_FRAMES } from "./videos/wk-eval/WkEval";
import { WkCli, WK_CLI_FRAMES } from "./videos/wk-cli/WkCli";
import { AkChScheduler, AK_CH_SCHEDULER_FRAMES } from "./videos/ak-ch-scheduler/AkChScheduler";
import { AkExtMemory, AK_EXT_MEMORY_FRAMES } from "./videos/ak-ext-memory/AkExtMemory";
import { AkChHttp, AK_CH_HTTP_FRAMES } from "./videos/ak-ch-http/AkChHttp";
import { AkExtSkills, AK_EXT_SKILLS_FRAMES } from "./videos/ak-ext-skills/AkExtSkills";
import { AkSessionSqlite, AK_SESSION_SQLITE_FRAMES } from "./videos/ak-session-sqlite/AkSessionSqlite";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 元视频：视频导览（根级别，所有 Folder 之前） */}
      <Composition
        id="VideoGuide"
        component={VideoGuide}
        durationInFrames={VG_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Folder name="Promo">
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
        <Composition
          id="AgentPromo"
          component={AgentPromo}
          durationInFrames={AGENTPROMO_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Security"
          component={Security}
          durationInFrames={SEC_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="CrossPlatform"
          component={CrossPlatform}
          durationInFrames={CP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Vision"
          component={Vision}
          durationInFrames={VIS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="OpenSource"
          component={OpenSource}
          durationInFrames={OS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Folder name="Pain-Points">
          <Composition
            id="PainPoints"
            component={PainPoints}
            durationInFrames={PP_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
        <Folder name="Investor">
          <Composition
            id="InvestorPitch"
            component={InvestorPitch}
            durationInFrames={INVESTOR_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
      </Folder>
      <Folder name="Tutorial">
        <Composition
          id="SkillTutorial"
          component={SkillTutorial}
          durationInFrames={SKILLTUT_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="QuickStart"
          component={QuickStart}
          durationInFrames={QS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="FriendTutorial"
          component={FriendTutorial}
          durationInFrames={FT_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="AgentConfig"
          component={AgentConfig}
          durationInFrames={AC_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="NanoClawGuide"
          component={NanoClawGuide}
          durationInFrames={NCG_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="Educational">
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
        <Composition
          id="Architecture"
          component={Architecture}
          durationInFrames={ARCH_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Saga"
          component={Saga}
          durationInFrames={SAGA_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Runtime"
          component={Runtime}
          durationInFrames={RUNTIME_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Testing"
          component={Testing}
          durationInFrames={TESTING_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="MessageSystem"
          component={MessageSystem}
          durationInFrames={MSG_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Deploy"
          component={Deploy}
          durationInFrames={DEPLOY_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Business"
          component={Business}
          durationInFrames={BIZ_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="AccountSystem"
          component={AccountSystem}
          durationInFrames={ACCT_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="WebSocket"
          component={WebSocketVideo}
          durationInFrames={WS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Roadmap"
          component={Roadmap}
          durationInFrames={RM_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Container"
          component={Container}
          durationInFrames={CONTAINER_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="TechStack"
          component={TechStack}
          durationInFrames={TS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ErrorHandling"
          component={ErrorHandling}
          durationInFrames={EH_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="Mcp"
          component={Mcp}
          durationInFrames={MCP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="SkillBrowser"
          component={SkillBrowserVideo}
          durationInFrames={SB_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="OpenclawPlugin"
          component={OpenclawPlugin}
          durationInFrames={OP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="VolumeSafety"
          component={VolumeSafety}
          durationInFrames={VS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="OpenclawMemory"
          component={OpenclawMemory}
          durationInFrames={OCMEM_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Folder name="Runtime-Compare">
          <Composition
            id="RuntimeBattle"
            component={RuntimeBattle}
            durationInFrames={RB_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="SecurityFaceoff"
            component={SecurityFaceoff}
            durationInFrames={SF_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="StateMemory"
            component={StateMemory}
            durationInFrames={SM_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
      </Folder>
      <Folder name="Developer">
        <Composition
          id="SkillDevwalk"
          component={SkillDevwalk}
          durationInFrames={SKILLDEV_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ImServerWalk"
          component={ImServerWalk}
          durationInFrames={IMW_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="AgentServerWalk"
          component={AgentServerWalk}
          durationInFrames={ASW_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ContainerWalk"
          component={ContainerWalk}
          durationInFrames={CW_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="OpenclawVolume"
          component={OpenclawVolume}
          durationInFrames={OV_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="DevSetup"
          component={DevSetup}
          durationInFrames={DXSETUP_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="Tech-Sharing">
        <Composition
          id="ShareSaga"
          component={ShareSaga}
          durationInFrames={SSAGA_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
        <Composition
          id="ShareVolume"
          component={ShareVolume}
          durationInFrames={SVOL_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="Startup">
        <Folder name="Roadmap">
          <Composition
            id="AgentMarket"
            component={AgentMarket}
            durationInFrames={AMKT_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="SeedAgents"
            component={SeedAgents}
            durationInFrames={SA_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
        <Folder name="Biz-Model">
          <Composition
            id="BizOpportunities"
            component={BizOpportunities}
            durationInFrames={BIZOP_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AgentAgency"
            component={AgentAgency}
            durationInFrames={AAGENCY_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
        <Folder name="Tech">
          <Composition
            id="CoreTools"
            component={CoreTools}
            durationInFrames={CT_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="K8sGuide"
            component={K8sGuide}
            durationInFrames={K8S_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="K8sDeploy"
            component={K8sDeploy}
            durationInFrames={K8SDEPLOY_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="TechArch"
            component={TechArch}
            durationInFrames={TECHARCH_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
        <Folder name="Developer">
          <Composition
            id="AkAgentic"
            component={AkAgentic}
            durationInFrames={AK_AGENTIC_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkCore"
            component={AkCore}
            durationInFrames={AK_CORE_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkProviderOpenai"
            component={AkProviderOpenai}
            durationInFrames={AK_PROVIDER_OPENAI_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkEval"
            component={AkEval}
            durationInFrames={AK_EVAL_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkCli"
            component={AkCli}
            durationInFrames={AK_CLI_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkExtensionGuide"
            component={AkExtensionGuide}
            durationInFrames={AK_EXTENSION_GUIDE_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkDevGuide"
            component={AkDevGuide}
            durationInFrames={AK_DEV_GUIDE_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkChScheduler"
            component={AkChScheduler}
            durationInFrames={AK_CH_SCHEDULER_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkEventLoop"
            component={AkEventLoop}
            durationInFrames={AK_EVENT_LOOP_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkExtSkills"
            component={AkExtSkills}
            durationInFrames={AK_EXT_SKILLS_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkSessionSqlite"
            component={AkSessionSqlite}
            durationInFrames={AK_SESSION_SQLITE_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkExtMemory"
            component={AkExtMemory}
            durationInFrames={AK_EXT_MEMORY_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
          <Composition
            id="AkChHttp"
            component={AkChHttp}
            durationInFrames={AK_CH_HTTP_FRAMES}
            fps={30}
            width={1920}
            height={1080}
          />
        </Folder>
      </Folder>
      <Folder name="Industry">
        <Composition
          id="AiTrends2026"
          component={AiTrends2026}
          durationInFrames={AITRENDS_FRAMES}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="Walkthrough">
        <Composition id="WkCore" component={WkCore} durationInFrames={WK_CORE_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkEventLoop" component={WkEventLoop} durationInFrames={WK_EVENT_LOOP_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkAgentic" component={WkAgentic} durationInFrames={WK_AGENTIC_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkProviderLlm" component={WkProviderLlm} durationInFrames={WK_PROVIDER_LLM_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkProviderSession" component={WkProviderSession} durationInFrames={WK_PROVIDER_SESSION_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkExtSkills" component={WkExtSkills} durationInFrames={WK_EXT_SKILLS_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkExtMemory" component={WkExtMemory} durationInFrames={WK_EXT_MEMORY_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkChHttp" component={WkChHttp} durationInFrames={WK_CH_HTTP_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkChScheduler" component={WkChScheduler} durationInFrames={WK_CH_SCHEDULER_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkEval" component={WkEval} durationInFrames={WK_EVAL_FRAMES} fps={30} width={1920} height={1080} />
        <Composition id="WkCli" component={WkCli} durationInFrames={WK_CLI_FRAMES} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
