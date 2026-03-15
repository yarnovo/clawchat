import React from "react";
import { CategoryCard } from "./CategoryCard";

export const SceneVgDev: React.FC = () => (
  <CategoryCard
    number={4}
    category="开发"
    verb="带你读"
    description="面向代码贡献者，逐文件代码走读"
    examples={[
      { icon: "📡", title: "im-server" },
      { icon: "🤖", title: "agent-server" },
      { icon: "📦", title: "Volume 结构" },
    ]}
    accentVerb
  />
);
