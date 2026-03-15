import React from "react";
import { CategoryCard } from "./CategoryCard";

export const SceneVgPromo: React.FC = () => (
  <CategoryCard
    number={1}
    category="宣传"
    verb="说服你选"
    description="面向潜在用户和投资人，展示产品价值"
    examples={[
      { icon: "📺", title: "产品宣传" },
      { icon: "🤖", title: "Agent 卖点" },
      { icon: "🔒", title: "安全架构" },
      { icon: "💰", title: "投资人 Pitch" },
    ]}
  />
);
