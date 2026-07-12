import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

function getCorsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) })
}

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(request) })
  const userId = session.user.id

  try {
    const [keywords, settings, groups] = await Promise.all([
      prisma.keyword.findMany({
        where: { userId, enabled: true },
        select: { keyword: true }
      }),
      prisma.settings.findUnique({
        where: { userId }
      }),
      prisma.monitoredGroup.findMany({
        where: { userId, enabled: true },
        select: { facebookGroupId: true }
      })
    ])

    return NextResponse.json({
      keywords: keywords.map(k => k.keyword),
      groups: groups.map(g => g.facebookGroupId),
      scanInterval: settings?.scanInterval || 5,
      autoScrollPages: settings?.autoScrollPages ?? 5,
      activeFrom: settings?.activeFrom || "08:00",
      activeTo: settings?.activeTo || "20:00",
      monitoringMode: settings?.monitoringMode || "default",
    }, { headers: getCorsHeaders(request) })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: getCorsHeaders(request) })
  }
}
