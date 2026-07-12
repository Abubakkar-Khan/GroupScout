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

    const group = await prisma.monitoredGroup.updateMany({
      where: { id, userId: session.user.id },
      data: { enabled },
    })
    if (group.count === 0) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    const updated = await prisma.monitoredGroup.findUnique({ where: { id } })
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
    const group = await prisma.monitoredGroup.findFirst({ where: { id, userId: session.user.id } })
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })

    await prisma.monitoredGroup.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
