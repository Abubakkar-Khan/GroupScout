import { cookies } from "next/headers"
import { prisma } from "./db"
import crypto from "crypto"

export async function getSession(req?: Request) {
  let sessionId = null

  if (req) {
    const authHeader = req.headers.get("Authorization")
    if (authHeader && authHeader.startsWith("Bearer ")) {
      sessionId = authHeader.substring(7)
    }
  }

  if (!sessionId) {
    const cookieStore = await cookies()
    sessionId = cookieStore.get("sessionId")?.value
  }

  if (!sessionId) {
    return null
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionId },
    include: { user: { select: { id: true, email: true, name: true } } }
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return {
    user: session.user,
    session
  }
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    }
  })

  const cookieStore = await cookies()
  cookieStore.set("sessionId", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt
  })

  return session
}

export async function destroySession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("sessionId")?.value

  if (sessionId) {
    await prisma.session.delete({
      where: { token: sessionId }
    }).catch(() => {}) // Ignore if already deleted
  }

  cookieStore.delete("sessionId")
}
