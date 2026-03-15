import { CaseLayout } from "./CaseLayout";

export const SceneCaseLabor: React.FC = () => (
  <CaseLayout
    category="劳动合同"
    clauseTitle="竞业限制无补偿"
    clauseText={"第十五条  竞业限制\n\n员工离职后两年内，不得在同行业\n任何企业任职或自主经营同类业务。\n违反本条约定应支付违约金五十万元。"}
    riskLevel="high"
    issue="约定了竞业限制义务和高额违约金，但未约定经济补偿，条款不可执行"
    legalBasis="《劳动合同法》第 23、24 条"
    suggestion="增加竞业限制期间的经济补偿条款，月补偿不低于离职前月工资的 30%"
  />
);
