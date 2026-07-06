import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const posts = await prisma.post.findMany({
      where: { userId: session.user.id },
      include: { group: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
