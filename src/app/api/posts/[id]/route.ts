import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

import { prisma } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const { viewed } = body

    const post = await prisma.post.updateMany({
      where: { id, userId: session.user.id },
      data: { viewed },
    })
    if (post.count === 0) return NextResponse.json({ error: "Post not found" }, { status: 404 })

    const updated = await prisma.post.findUnique({ where: { id } })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
