import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const groups = await prisma.monitoredGroup.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(groups)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { url } = await request.json()
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 })

    const match = url.match(/facebook\.com\/groups\/([^\/\?]+)/)
    const facebookGroupId = match ? match[1] : null

    if (!facebookGroupId) {
      return NextResponse.json({ error: "Invalid Facebook Group URL" }, { status: 400 })
    }

    const group = await prisma.monitoredGroup.create({
      data: {
        userId: session.user.id,
        facebookGroupId,
        name: facebookGroupId, // Default to the ID since we can't easily scrape it from the server
        enabled: true
      }
    })
    
    return NextResponse.json(group)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Group is already being monitored" }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
