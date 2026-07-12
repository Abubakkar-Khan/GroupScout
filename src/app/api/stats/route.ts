import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

import { prisma } from "@/lib/db"
import { getEngineStatus } from "@/lib/engine"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [keywordMatchesToday, leadsToday, totalLeads, latestSync, totalScrapedAgg] = await Promise.all([
      // Total raw posts collected today (both relevant and non-relevant)
      prisma.post.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: today },
        },
      }),
      // Only relevant posts collected today
      prisma.post.count({
        where: {
          userId: session.user.id,
          relevant: true,
          createdAt: { gte: today },
        },
      }),
      // All-time relevant posts
      prisma.post.count({ 
        where: { 
          userId: session.user.id,
          relevant: true 
        } 
      }),
      // Latest extension state sync
      prisma.logEvent.findFirst({
        where: {
          userId: session.user.id,
          type: "STATE_SYNC"
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Total posts scraped
      prisma.monitoredGroup.aggregate({
        where: { userId: session.user.id },
        _sum: { postsScanned: true }
      })
    ])

    // Check if the extension synced within the last 60 seconds
    const isConnected = latestSync && (new Date().getTime() - new Date(latestSync.createdAt).getTime()) < 60000;
    const extensionState = latestSync && latestSync.metadata ? JSON.parse(latestSync.metadata) : null;

    return NextResponse.json({
      status: getEngineStatus() === "running" ? "Active" : "Offline",
      keywordMatchesToday,
      leadsToday,
      totalLeads,
      totalScraped: totalScrapedAgg._sum.postsScanned || 0,
      extensionState: isConnected ? extensionState : null
    })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
