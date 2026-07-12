import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "50")
  const relevantParam = searchParams.get("relevant")
  const viewedParam = searchParams.get("viewed")
  
  let whereClause: any = { userId: session.user.id }
  if (relevantParam === "true") whereClause.relevant = true
  if (relevantParam === "false") whereClause.relevant = false
  if (viewedParam === "true") whereClause.viewed = true
  if (viewedParam === "false") whereClause.viewed = false

  try {
    const posts = await prisma.post.findMany({
      where: whereClause,
      include: { group: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
