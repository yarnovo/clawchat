import { Settings } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="size-6 text-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
      </div>

      <Separator className="mb-6" />

      <div className="space-y-6 max-w-lg">
        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Appearance</h3>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  )
}
