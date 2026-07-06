import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// Allow CORS for the Chrome Extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-user-id",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: Request) {
  const userId = request.headers.get("x-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })

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
      activeFrom: settings?.activeFrom || "08:00",
      activeTo: settings?.activeTo || "20:00",
      monitoringMode: settings?.monitoringMode || "default",
    }, { headers: corsHeaders })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders })
  }
}
