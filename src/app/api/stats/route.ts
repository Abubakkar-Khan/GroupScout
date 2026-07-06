import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalLeads, leadsToday] = await Promise.all([
      prisma.post.count({ where: { userId: session.user.id } }),
      prisma.post.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: today },
        },
      }),
    ])

    return NextResponse.json({
      status: "Active", // In a real app, this could check the last extension ping
      totalLeads,
      leadsToday,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
