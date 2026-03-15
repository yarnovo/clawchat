import React from "react";
import { CategoryCard } from "./CategoryCard";

export const SceneVgEdu: React.FC = () => (
  <CategoryCard
    number={3}
    category="科普"
    verb="帮你懂"
    description="面向技术圈的同行，解释我们的设计决策"
    examples={[
      { icon: "🏗️", title: "架构设计" },
      { icon: "🔄", title: "Saga 模式" },
      { icon: "💬", title: "消息系统" },
      { icon: "✅", title: "测试体系" },
    ]}
  />
);
