import { CaseLayout } from "./CaseLayout";

export const SceneCaseRent: React.FC = () => (
  <CaseLayout
    category="租赁合同"
    clauseTitle="全面免责条款"
    clauseText={"第十二条  免责声明\n\n因任何原因导致承租人在租赁房屋内\n遭受的人身伤害或财产损失，\n出租人均不承担任何责任。"}
    riskLevel="high"
    issue="免责范围过于宽泛，排除了出租人因自身过错导致的赔偿责任"
    legalBasis="《民法典》第 506 条"
    suggestion="限定免责范围，仅排除承租人自身过错导致的损失"
  />
);
