import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { classifyPost, getGroqClient } from "@/lib/groq"
import { encrypt, decrypt } from "@/lib/encryption"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-user-id",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  const userId = request.headers.get("x-user-id")
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })

  try {
    const body = await request.json()
    const { groupId, groupName, postId, content, url, keyword } = body

    if (!groupId || !postId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders })
    }

    // Upsert the group
    const group = await prisma.monitoredGroup.upsert({
      where: { userId_facebookGroupId: { userId, facebookGroupId: groupId } },
      update: { lastScan: new Date() },
      create: {
        userId,
        facebookGroupId: groupId,
        name: groupName || "Unknown Group",
      }
    })

    if (!group.enabled) {
      return NextResponse.json({ message: "Group is paused" }, { headers: corsHeaders })
    }

    // Check if post already exists
    const existing = await prisma.post.findUnique({
      where: { userId_facebookPostId: { userId, facebookPostId: postId } }
    })

    if (existing) {
      return NextResponse.json({ message: "Already processed" }, { headers: corsHeaders })
    }

    // Classify using Groq
    const settings = await prisma.settings.findUnique({ where: { userId } })
    if (!settings?.groqApiKey) {
      return NextResponse.json({ error: "Groq API key not configured" }, { status: 400, headers: corsHeaders })
    }

    const groq = getGroqClient(settings.groqApiKey)
    const isRelevant = await classifyPost(groq, keyword || "Unknown", content)

    if (isRelevant) {
      // Save it
      await prisma.post.create({
        data: {
          userId,
          facebookPostId: postId,
          groupId: group.id,
          keyword: keyword || "Unknown",
          content,
          url: url || `https://facebook.com/groups/${groupId}/posts/${postId}`,
          relevant: true
        }
      })
      return NextResponse.json({ message: "Relevant lead saved" }, { headers: corsHeaders })
    }

    return NextResponse.json({ message: "Not relevant" }, { headers: corsHeaders })
  } catch (error) {
    console.error("Ingest error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders })
  }
}
