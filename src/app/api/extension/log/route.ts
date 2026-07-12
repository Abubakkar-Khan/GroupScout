import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

function getCorsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) })
}

export async function POST(request: Request) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(request) })

  try {
    const body = await request.json()
    const { type, message, metadata } = body

    if (!type || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: getCorsHeaders(request) })
    }

    await prisma.logEvent.create({
      data: {
        userId: session.user.id,
        type,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    // If this log event is reporting scanned posts, update the group metric
    if (metadata && metadata.groupId && metadata.postsScanned) {
      await prisma.monitoredGroup.updateMany({
        where: { 
          userId: session.user.id,
          facebookGroupId: metadata.groupId 
        },
        data: {
          postsScanned: {
            increment: metadata.postsScanned
          },
          lastScan: new Date()
        }
      }).catch(() => {})
    }

    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) })
  } catch (error) {
    console.error("Log error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: getCorsHeaders(request) })
  }
}
