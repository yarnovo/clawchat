import React from "react";
import { CategoryCard } from "./CategoryCard";

export const SceneVgShare: React.FC = () => (
  <CategoryCard
    number={5}
    category="技术分享"
    verb="让你会"
    description="面向技术社区，以 ClawChat 为案例输出通用技术知识"
    examples={[
      { icon: "🔄", title: "Saga 模式实战" },
      { icon: "🐳", title: "Docker Volume 踩坑" },
    ]}
    note="科普 = 我们怎么用 / 技术分享 = 教你怎么用"
  />
);
