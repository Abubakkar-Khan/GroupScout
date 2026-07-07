import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

import { prisma } from "@/lib/db"
import { encrypt } from "@/lib/encryption"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId: session.user.id },
      })
    }

    return NextResponse.json({
      userId: session.user.id,
      scanInterval: settings.scanInterval,
      autoScrollPages: settings.autoScrollPages,
      activeFrom: settings.activeFrom,
      activeTo: settings.activeTo,
      monitoringMode: settings.monitoringMode,
      groqApiKey: !!settings.groqApiKey, // Only return a boolean indicating if it's set
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { scanInterval, autoScrollPages, activeFrom, activeTo, monitoringMode, groqApiKey } = body

    const updateData: any = {
      scanInterval: isNaN(scanInterval) || scanInterval === null ? 5 : scanInterval,
      autoScrollPages: isNaN(autoScrollPages) || autoScrollPages === null ? 5 : autoScrollPages,
      activeFrom: activeFrom || "08:00",
      activeTo: activeTo || "20:00",
      monitoringMode: monitoringMode || "default",
    }

    if (groqApiKey) {
      updateData.groqApiKey = encrypt(groqApiKey)
    }

    const settings = await prisma.settings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
      },
    })

    return NextResponse.json({
      scanInterval: settings.scanInterval,
      autoScrollPages: settings.autoScrollPages,
      activeFrom: settings.activeFrom,
      activeTo: settings.activeTo,
      monitoringMode: settings.monitoringMode,
      groqApiKey: !!settings.groqApiKey,
    })
  } catch (error) {
    console.error("Settings PATCH error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
