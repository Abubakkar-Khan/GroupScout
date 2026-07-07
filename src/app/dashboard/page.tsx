"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ExternalLink, Activity, Users, Target } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Lead {
  id: string
  groupId: string
  facebookPostId: string
  keyword: string
  content: string
  url: string
  viewed: boolean
  relevant: boolean
  createdAt: string
  group: { name: string }
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [activity, setActivity] = useState<Lead[]>([])
  const [stats, setStats] = useState({ leadsToday: 0, totalLeads: 0, status: "Active" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsRes, statsRes, activityRes] = await Promise.all([
          fetch("/api/posts?relevant=true&limit=10"),
          fetch("/api/stats"),
          fetch("/api/posts?limit=20") // All posts for Live Feed
        ])
        if (leadsRes.ok) setLeads(await leadsRes.json())
        if (statsRes.ok) setStats(await statsRes.json())
        if (activityRes.ok) setActivity(await activityRes.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">Monitor your high-intent Facebook Group leads.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monitoring Status</CardTitle>
            <Activity className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-emerald-500">{stats.status}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Extension is connected</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Today</CardTitle>
            <Target className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats.leadsToday}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Relevant matches found today</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">All-time discovered leads</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live AI Activity</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Real-time classification feed</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Live</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-background/50">
                    <div className="flex justify-between items-center"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-16" /></div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Waiting for extension to scan posts...
                </div>
              ) : (
                activity.map((post) => (
                  <div key={post.id} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/50 bg-background/50 transition-colors hover:bg-muted/50">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-sm truncate">{post.group?.name || "Unknown Group"}</span>
                      {post.relevant ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px] uppercase tracking-wider shrink-0">Relevant</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wider shrink-0 text-muted-foreground bg-muted">Ignored</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">kw: {post.keyword}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Highest intent posts requiring action</p>
          </CardHeader>
          <CardContent className="flex-1">
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="max-w-[300px]">Preview</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No leads found yet. Ensure the extension is running and monitoring groups.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.group?.name || "Unknown Group"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{lead.keyword}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {lead.content}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {lead.viewed ? (
                          <Badge variant="outline" className="text-muted-foreground border-border">Viewed</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">New</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <a 
                          href={lead.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={buttonVariants({ variant: "outline", size: "sm", className: "gap-2" })}
                          onClick={() => {
                            fetch(`/api/posts/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ viewed: true }) })
                          }}
                        >
                          View Post <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
