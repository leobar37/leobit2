"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { cn } from "~/lib/utils"

const appDrawerVariants = cva(
  "flex flex-col max-h-[85vh]",
  {
    variants: {
      size: {
        default: "",
        large: "max-h-[90vh]",
        full: "max-h-[95vh]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface AppDrawerHeaderProps {
  title: React.ReactNode
  icon?: React.ReactNode
  onClose?: () => void
  showCloseButton?: boolean
  className?: string
}

function AppDrawerHeader({
  title,
  icon,
  onClose,
  showCloseButton = true,
  className,
}: AppDrawerHeaderProps) {
  return (
    <DrawerHeader className={cn("border-b px-4 pb-3 pt-3", className)}>
      <div className="flex items-center justify-between">
        <DrawerTitle className="flex items-center gap-2 text-lg font-semibold">
          {icon && <span className="text-orange-500">{icon}</span>}
          {title}
        </DrawerTitle>
        {showCloseButton && (
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-xl -mr-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cerrar</span>
            </Button>
          </DrawerClose>
        )}
      </div>
    </DrawerHeader>
  )
}

interface AppDrawerBodyProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

function AppDrawerBody({
  children,
  className,
  scrollable = true,
}: AppDrawerBodyProps) {
  return (
    <div
      className={cn(
        "flex-1 px-4 py-4",
        scrollable && "overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  )
}

interface AppDrawerFooterProps {
  children: React.ReactNode
  className?: string
}

function AppDrawerFooter({ children, className }: AppDrawerFooterProps) {
  return (
    <DrawerFooter className={cn("border-t px-4 py-4", className)}>
      {children}
    </DrawerFooter>
  )
}

interface AppDrawerProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  size?: VariantProps<typeof appDrawerVariants>["size"]
  contentClassName?: string
}

function AppDrawerRoot({
  children,
  size,
  contentClassName,
  ...props
}: AppDrawerProps) {
  return (
    <Drawer {...props}>
      <DrawerContent className={cn(appDrawerVariants({ size }), contentClassName)}>
        {children}
      </DrawerContent>
    </Drawer>
  )
}

export const AppDrawer = Object.assign(AppDrawerRoot, {
  Header: AppDrawerHeader,
  Body: AppDrawerBody,
  Footer: AppDrawerFooter,
  Close: DrawerClose,
})

export type { AppDrawerProps, AppDrawerHeaderProps, AppDrawerBodyProps, AppDrawerFooterProps }
