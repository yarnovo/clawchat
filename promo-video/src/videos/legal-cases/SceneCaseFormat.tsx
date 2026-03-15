import { CaseLayout } from "./CaseLayout";

export const SceneCaseFormat: React.FC = () => (
  <CaseLayout
    category="采购合同"
    clauseTitle="格式条款免除核心义务"
    clauseText={"第六条  质量保证\n\n供应商对所供货物不作任何明示\n或暗示的质量保证，买方应自行\n检验并承担全部质量风险。"}
    riskLevel="high"
    issue="格式条款免除了供应商的基本质量保证义务，加重买方责任"
    legalBasis="《民法典》第 497 条"
    suggestion="该条款依法应属无效，要求供应商提供合理质量保证"
  />
);
