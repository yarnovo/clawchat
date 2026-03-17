import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useUIStore } from "@/stores/ui-store"
import { useTheme } from "@/hooks/use-theme"

export function SettingsDialog() {
  const open = useUIStore((s) => s.settingsOpen)
  const setOpen = useUIStore((s) => s.setSettingsOpen)
  const logout = useUIStore((s) => s.logout)
  const { theme, setTheme } = useTheme()

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>设置</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>管理你的账号和偏好设置</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Tabs defaultValue="account">
          <TabsList className="w-full">
            <TabsTrigger value="account">账号</TabsTrigger>
            <TabsTrigger value="appearance">外观</TabsTrigger>
            <TabsTrigger value="general">通用</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>

          {/* 账号 */}
          <TabsContent value="account">
            <Card size="sm">
              <CardHeader>
                <CardTitle>账号</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">头像</span>
                  <Avatar size="sm">
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">昵称</span>
                  <span className="text-sm">用户</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">邮箱</span>
                  <span className="text-sm">user@clawchat.app</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">操作</span>
                  <Button variant="outline" size="sm" onClick={logout}>
                    退出登录
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 外观 */}
          <TabsContent value="appearance">
            <Card size="sm">
              <CardHeader>
                <CardTitle>外观</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">主题</span>
                  <Select
                    value={theme}
                    onValueChange={(val) =>
                      setTheme(val as "light" | "dark" | "system")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">浅色</SelectItem>
                      <SelectItem value="dark">深色</SelectItem>
                      <SelectItem value="system">跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">字号</span>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">小</SelectItem>
                      <SelectItem value="default">默认</SelectItem>
                      <SelectItem value="large">大</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 通用 */}
          <TabsContent value="general">
            <Card size="sm">
              <CardHeader>
                <CardTitle>通用设置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="language">语言</Label>
                  <Select defaultValue="zh">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh">简体中文</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="chat-history">保留聊天记录</Label>
                    <p className="text-xs text-muted-foreground">
                      关闭后将不再保存历史消息
                    </p>
                  </div>
                  <Switch id="chat-history" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">消息通知</Label>
                    <p className="text-xs text-muted-foreground">
                      接收新消息时弹出提醒
                    </p>
                  </div>
                  <Switch id="notifications" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound">提示音</Label>
                    <p className="text-xs text-muted-foreground">
                      新消息到达时播放声音
                    </p>
                  </div>
                  <Switch id="sound" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 关于 */}
          <TabsContent value="about">
            <Card size="sm">
              <CardHeader>
                <CardTitle>关于 ClawChat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">版本</span>
                  <span className="text-sm">0.1.0</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">框架</span>
                  <span className="text-sm">React + Vite</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">UI</span>
                  <span className="text-sm">shadcn/ui</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
