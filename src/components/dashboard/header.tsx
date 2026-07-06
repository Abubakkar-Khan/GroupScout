"use client"

import { useSession } from "@/lib/auth-client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="flex h-14 items-center justify-end border-b border-border bg-background/50 backdrop-blur-xl px-6 gap-4">
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
        <Bell className="size-4" />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
      </Button>
      
      <div className="flex items-center gap-2">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-none">{session?.user.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{session?.user.email}</p>
        </div>
        <Avatar className="size-8 border border-border">
          <AvatarImage src={session?.user.image || ""} />
          <AvatarFallback>{session?.user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
