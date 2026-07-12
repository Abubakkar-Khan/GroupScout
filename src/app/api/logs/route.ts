import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "100")

  try {
    const logs = await prisma.logEvent.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
