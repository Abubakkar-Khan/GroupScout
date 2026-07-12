import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { classifyPost, getGroqClient } from "@/lib/groq"
import { getSession } from "@/lib/auth"
import { findBestKeywordMatch } from "@/lib/lead-matching"

function getCorsHeaders(request: Request) {
  return {
    "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: getCorsHeaders(request) })
}

export async function POST(request: Request) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders(request) })
  const userId = session.user.id

  try {
    const body = await request.json()
    const { groupId, groupName, postId, content, url, keyword } = body

    if (!groupId || !postId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: getCorsHeaders(request) })
    }

    const existingGroup = await prisma.monitoredGroup.findFirst({
      where: { userId, facebookGroupId: groupId },
    })

    const group = existingGroup
      ? await prisma.monitoredGroup.update({
        where: { id: existingGroup.id },
        data: {
          lastScan: new Date(),
          ...(groupName && groupName !== "Unknown Group" ? { name: groupName } : {})
        },
      })
      : await prisma.monitoredGroup.create({
      data: {
        userId,
        facebookGroupId: groupId,
        name: groupName || "Unknown Group",
      }
    })

    if (!group.enabled) {
      return NextResponse.json({ message: "Group is paused" }, { headers: getCorsHeaders(request) })
    }

    // Check if post already exists
    const existing = await prisma.post.findUnique({
      where: { userId_facebookPostId: { userId, facebookPostId: postId } }
    })

    if (existing) {
      return NextResponse.json({ message: "Already processed" }, { headers: getCorsHeaders(request) })
    }

    const keywords = await prisma.keyword.findMany({
      where: { userId, enabled: true },
      select: { keyword: true },
    })
    const matched = keyword
      ? { keyword: String(keyword), score: 100 }
      : findBestKeywordMatch(content, keywords)

    if (!matched) {
      return NextResponse.json({ message: "No keyword match" }, { headers: getCorsHeaders(request) })
    }

    // Classify using Groq OR bypass if AI is disabled
    const settings = await prisma.settings.findUnique({ where: { userId } })
    
    let isRelevant = true; // Default to true if AI is disabled or not configured
    
    if (settings?.useGroq && settings.groqApiKey) {
      const groq = getGroqClient(settings.groqApiKey)
      isRelevant = await classifyPost(
        groq, 
        matched.keyword,
        content, 
        settings.groqSystemPrompt || ""
      )
    }

    // Save ALL posts (for the live dashboard feed), mark relevance
    await prisma.post.create({
      data: {
        userId,
        facebookPostId: postId,
        groupId: group.id,
        keyword: matched.keyword,
        content,
        url: url || `https://facebook.com/groups/${groupId}/posts/${postId}`,
        relevant: isRelevant
      }
    })

    if (isRelevant) {
      return NextResponse.json({ message: "Relevant lead saved" }, { headers: getCorsHeaders(request) })
    }

    return NextResponse.json({ message: "Ignored by AI" }, { headers: getCorsHeaders(request) })
  } catch (error) {
    console.error("Ingest error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: getCorsHeaders(request) })
  }
}
