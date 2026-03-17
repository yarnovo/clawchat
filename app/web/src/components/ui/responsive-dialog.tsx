import * as React from "react"
import { createContext, useContext } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const ResponsiveContext = createContext(true)

function useIsDesktop() {
  return useContext(ResponsiveContext)
}

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <ResponsiveContext.Provider value={isDesktop}>
      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      )}
    </ResponsiveContext.Provider>
  )
}

function ResponsiveDialogContent({
  children,
  className,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isDesktop = useIsDesktop()

  if (isDesktop) {
    return (
      <DialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </DialogContent>
    )
  }

  return <DrawerContent className={className}>{children}</DrawerContent>
}

function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DialogHeader {...props} /> : <DrawerHeader {...props} />
}

function ResponsiveDialogFooter({
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogFooter showCloseButton={showCloseButton} {...props} />
  ) : (
    <DrawerFooter {...props} />
  )
}

function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>
) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DialogTitle {...props} /> : <DrawerTitle {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  const isDesktop = useIsDesktop()
  return isDesktop ? (
    <DialogDescription {...props} />
  ) : (
    <DrawerDescription {...props} />
  )
}

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>
) {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DialogClose {...props} /> : <DrawerClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose,
}
