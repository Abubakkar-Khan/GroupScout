import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"
import { encrypt } from "@/lib/encryption"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
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
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { scanInterval, activeFrom, activeTo, monitoringMode, groqApiKey } = body

    const updateData: any = {
      scanInterval,
      activeFrom,
      activeTo,
      monitoringMode,
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
      activeFrom: settings.activeFrom,
      activeTo: settings.activeTo,
      monitoringMode: settings.monitoringMode,
      groqApiKey: !!settings.groqApiKey,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
