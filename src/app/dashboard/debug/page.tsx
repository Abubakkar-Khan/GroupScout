"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LogEvent {
  id: string
  type: string
  message: string
  metadata: string | null
  createdAt: string
}

export default function DebugPage() {
  const [logs, setLogs] = useState<LogEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/logs?limit=100")
      if (res.ok) {
        setLogs(await res.json())
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchLogs()
    }, 0)
    const interval = setInterval(fetchLogs, 10000)
    return () => {
      window.clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [])

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "ERROR": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "WARN": return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "SUCCESS": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "STATE_SYNC": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Terminal className="h-6 w-6" /> Debug Terminal
          </h1>
          <p className="text-muted-foreground mt-1">Live event stream from the GroupScout extension engine.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="bg-black/90 text-green-400 border-border/50 font-mono text-sm overflow-hidden shadow-xl">
        <CardHeader className="border-b border-white/10 bg-black py-3">
          <CardTitle className="text-xs text-white/50 flex gap-2">
            <span className="text-red-500">●</span>
            <span className="text-yellow-500">●</span>
            <span className="text-green-500">●</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto custom-scrollbar p-4 space-y-1">
            {logs.length === 0 && !loading ? (
              <div className="text-center text-white/30 py-8">No logs received yet...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-white/5 p-1 rounded transition-colors group">
                  <span className="text-white/30 shrink-0 mt-0.5 text-xs">
                    [{new Date(log.createdAt).toLocaleTimeString()}]
                  </span>
                  <Badge className={`text-[10px] uppercase shrink-0 mt-0.5 ${getBadgeColor(log.type)}`}>
                    {log.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-white/90 break-words">{log.message}</span>
                    {log.metadata && log.type !== "STATE_SYNC" && (
                      <pre className="mt-1 text-[10px] text-white/50 bg-black/50 p-2 rounded overflow-x-auto border border-white/5">
                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
