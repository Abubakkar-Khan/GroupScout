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
    const { enabled } = body

    const keyword = await prisma.keyword.updateMany({
      where: { id, userId: session.user.id },
      data: { enabled },
    })
    if (keyword.count === 0) return NextResponse.json({ error: "Keyword not found" }, { status: 404 })

    const updated = await prisma.keyword.findUnique({ where: { id } })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const keyword = await prisma.keyword.findFirst({ where: { id, userId: session.user.id } })
    if (!keyword) return NextResponse.json({ error: "Keyword not found" }, { status: 404 })

    await prisma.keyword.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
