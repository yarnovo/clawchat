import { CaseLayout } from "./CaseLayout";

export const SceneCasePenalty: React.FC = () => (
  <CaseLayout
    category="服务协议"
    clauseTitle="违约金过高"
    clauseText={"第八条  违约责任\n\n任何一方违反本协议约定的，\n应向守约方支付合同总金额 50%\n作为违约金，并赔偿全部损失。"}
    riskLevel="mid"
    issue="违约金比例过高，可能被法院认定为不合理，面临调减风险"
    legalBasis="《民法典》第 585 条"
    suggestion="将违约金调整至合同总额的 10%-20%，或与实际损失挂钩"
  />
);
