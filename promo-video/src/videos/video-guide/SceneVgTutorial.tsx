import React from "react";
import { CategoryCard } from "./CategoryCard";

export const SceneVgTutorial: React.FC = () => (
  <CategoryCard
    number={2}
    category="教程"
    verb="教你用"
    description="面向已有用户，一步步教你上手每个功能"
    examples={[
      { icon: "🚀", title: "快速开始" },
      { icon: "👥", title: "好友系统" },
      { icon: "⚙️", title: "Agent 配置" },
      { icon: "🧩", title: "技能安装" },
    ]}
    accentVerb
  />
);
