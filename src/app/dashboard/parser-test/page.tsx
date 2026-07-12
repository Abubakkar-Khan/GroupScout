"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, Bug, ExternalLink } from "lucide-react"

interface ParserPost {
  author?: string
  postId?: string
  timestamp?: string
  url?: string
  content?: string
}

interface ParserResult {
  timestamp: number
  url?: string
  groupName?: string
  groupId?: string
  posts?: ParserPost[]
}

export default function ParserTestPage() {
  const [result, setResult] = useState<ParserResult | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchResults = async () => {
    try {
      const res = await fetch("/api/extension/parser-test")
      const data = await res.json()
      if (!data.error) {
        setResult(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchResults()
    }, 0)
    const interval = setInterval(fetchResults, 2000)
    return () => {
      window.clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Parser Test Diagnostics</h1>
        <p className="text-muted-foreground mt-1">Live extraction results from the GroupScout extension.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Skeleton className="h-8 w-24" /> : result ? "Received" : "Waiting"}
            </div>
            {result && <p className="text-xs text-muted-foreground mt-1">Last run: {new Date(result.timestamp).toLocaleTimeString()}</p>}
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Page</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {loading ? <Skeleton className="h-6 w-full" /> : result?.url || "No test executed yet"}
            </div>
            {result?.groupName && (
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{result.groupName}</Badge>
                <Badge variant="secondary">ID: {result.groupId}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="size-5" /> 
            Raw Extracted Posts 
            {result && <Badge className="ml-2">{result.posts?.length || 0} Found</Badge>}
          </CardTitle>
          <CardDescription>
            To run a new test, go to a Facebook group, click the GroupScout extension icon, and click Run Parser Test.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !result ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed border-border/50 bg-background/30">
              <Activity className="size-8 mx-auto mb-3 opacity-50" />
              <p>Waiting for the extension to send parser results...</p>
            </div>
          ) : result.posts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed border-border/50 bg-destructive/10 text-destructive">
              <Bug className="size-8 mx-auto mb-3 opacity-50" />
              <p>The parser ran but found 0 posts. Facebook DOM may have changed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(result.posts ?? []).map((post, i) => (
                <div key={i} className="border border-border/50 rounded-lg p-4 bg-background/50 text-sm">
                  <div className="flex justify-between items-start mb-3 border-b border-border/50 pb-3">
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {post.author || "Unknown Author"}
                        {post.postId && <Badge variant="outline" className="text-xs font-mono font-normal">ID: {post.postId}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {post.timestamp || "Unknown Time"}
                      </div>
                    </div>
                    {post.url && (
                      <a href={post.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs">
                        Permalink <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {post.content ? post.content : <span className="text-destructive font-semibold">ERROR: No content extracted</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
