"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Users, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface Group {
  id: string
  facebookGroupId: string
  name: string
  enabled: boolean
  lastScan: string | null
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [newGroupUrl, setNewGroupUrl] = useState("")
  const [adding, setAdding] = useState(false)

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups")
      if (res.ok) setGroups(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const toggleGroup = async (id: string, enabled: boolean) => {
    setGroups(groups.map(g => g.id === id ? { ...g, enabled } : g))
    try {
      await fetch(`/api/groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      })
      toast.success(enabled ? "Group monitoring enabled" : "Group monitoring disabled")
    } catch (e) {
      toast.error("Failed to update group")
      fetchGroups()
    }
  }

  const removeGroup = async (id: string) => {
    setGroups(groups.filter(g => g.id !== id))
    try {
      await fetch(`/api/groups/${id}`, { method: "DELETE" })
      toast.success("Group removed")
    } catch (e) {
      toast.error("Failed to remove group")
      fetchGroups()
    }
  }

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupUrl.trim()) return

    setAdding(true)
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        body: JSON.stringify({ url: newGroupUrl })
      })
      
      const data = await res.json()
      if (res.ok) {
        toast.success("Group added to monitoring")
        setNewGroupUrl("")
        fetchGroups() // Refresh list
      } else {
        toast.error(data.error || "Failed to add group")
      }
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monitored Groups</h1>
        <p className="text-muted-foreground mt-1">Manage which Facebook Groups the extension scans.</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Add Group</CardTitle>
          <CardDescription>Manually add a Facebook Group to monitor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addGroup} className="flex gap-2">
            <input
              type="url"
              placeholder="https://www.facebook.com/groups/..."
              value={newGroupUrl}
              onChange={(e) => setNewGroupUrl(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
            <Button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Your Groups</CardTitle>
          <CardDescription>Groups are automatically added when you visit them, or you can add them above.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-24 mb-6" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : groups.length === 0 ? (
              <div className="col-span-full py-12 text-center border rounded-lg border-dashed border-border/50 bg-background/30">
                <Users className="size-8 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No groups monitored</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Open a Facebook Group in your browser and use the extension to start monitoring.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <Card key={group.id} className="border-border/50 flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <h3 className="font-medium truncate" title={group.name}>{group.name}</h3>
                      <Badge variant={group.enabled ? "default" : "secondary"}>
                        {group.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-6">
                      Last scan: {group.lastScan ? formatDistanceToNow(new Date(group.lastScan), { addSuffix: true }) : "Never"}
                    </p>
                    
                    <div className="mt-auto flex justify-between items-center pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={group.enabled} 
                          onCheckedChange={(c) => toggleGroup(group.id, c)} 
                        />
                        <span className="text-sm text-muted-foreground">Monitor</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeGroup(group.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
