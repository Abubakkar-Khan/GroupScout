"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Header() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user)
      })
      .catch(() => {})
  }, [])

  return (
    <header className="flex h-14 items-center justify-end border-b border-border bg-background/50 backdrop-blur-xl px-6 gap-4">
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
        <Bell className="size-4" />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
      </Button>
      
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-none">{user?.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <Avatar className="size-8 border border-border">
          <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
