"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "#fff",
          color: "#111827",
          border: "1px solid #e5e7eb",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-white group-[.toaster]:!text-gray-900 group-[.toaster]:!border-gray-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:!text-gray-900",
          actionButton:
            "group-[.toast]:!bg-white group-[.toast]:!text-gray-900 group-[.toast]:border group-[.toast]:border-gray-200",
          cancelButton:
            "group-[.toast]:!bg-white group-[.toast]:!text-gray-900 group-[.toast]:border group-[.toast]:border-gray-200",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
