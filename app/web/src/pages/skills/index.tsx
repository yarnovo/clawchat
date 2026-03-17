import { useState } from "react"
import { SkillList } from "@/features/skills/skill-list"
import { SkillDetail } from "@/features/skills/skill-detail"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function SkillsPage() {
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Mobile: toggle between list and detail
  if (!isDesktop) {
    if (selectedName) {
      return (
        <SkillDetail
          skillName={selectedName}
          onBack={() => setSelectedName(null)}
        />
      )
    }
    return (
      <SkillList
        className="w-full border-r-0"
        selectedSkillName={selectedName}
        onSkillSelect={setSelectedName}
      />
    )
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-full">
      <SkillList
        selectedSkillName={selectedName}
        onSkillSelect={setSelectedName}
      />
      {selectedName ? (
        <SkillDetail skillName={selectedName} />
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="h-14 shrink-0 border-b border-border" />
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground/60">
            选择一个技能查看详情
          </div>
        </div>
      )}
    </div>
  )
}
