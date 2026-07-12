"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tags, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"

interface Keyword {
  id: string
  keyword: string
  enabled: boolean
}

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyword, setNewKeyword] = useState("")
  const [adding, setAdding] = useState(false)

  const fetchKeywords = async () => {
    try {
      const res = await fetch("/api/keywords")
      if (res.ok) setKeywords(await res.json())
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchKeywords()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const addKeyword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyword.trim()) return
    
    setAdding(true)
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        body: JSON.stringify({ keyword: newKeyword.trim() })
      })
      if (res.ok) {
        const added = await res.json()
        setKeywords([added, ...keywords])
        setNewKeyword("")
        toast.success("Keyword added")
      } else {
        toast.error("Failed to add keyword")
      }
    } catch {
      toast.error("Error adding keyword")
    } finally {
      setAdding(false)
    }
  }

  const toggleKeyword = async (id: string, enabled: boolean) => {
    setKeywords(keywords.map(k => k.id === id ? { ...k, enabled } : k))
    try {
      await fetch(`/api/keywords/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      })
    } catch {
      toast.error("Failed to update keyword")
      fetchKeywords()
    }
  }

  const removeKeyword = async (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id))
    try {
      await fetch(`/api/keywords/${id}`, { method: "DELETE" })
      toast.success("Keyword removed")
    } catch {
      toast.error("Failed to remove keyword")
      fetchKeywords()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Keywords</h1>
        <p className="text-muted-foreground mt-1">Define the keywords to filter relevant posts locally.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-fit">
          <CardHeader>
            <CardTitle>Your Keywords</CardTitle>
            <CardDescription>Posts must contain at least one enabled keyword to be sent to AI classification.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-5 w-10 rounded-full" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))
              ) : keywords.length === 0 ? (
                <div className="py-12 text-center border rounded-lg border-dashed border-border/50 bg-background/30">
                  <Tags className="size-8 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No keywords yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add keywords to start filtering posts.</p>
                </div>
              ) : (
                keywords.map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg bg-background/30 hover:bg-background/50 transition-colors">
                    <span className="font-medium">{kw.keyword}</span>
                    <div className="flex items-center gap-4">
                      <Switch 
                        checked={kw.enabled} 
                        onCheckedChange={(c) => toggleKeyword(kw.id, c)} 
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeKeyword(kw.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-fit">
          <CardHeader>
            <CardTitle>Add Keyword</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addKeyword} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g. looking for a roofer"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!newKeyword.trim() || adding}>
                <Plus className="size-4 mr-2" /> Add Keyword
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
