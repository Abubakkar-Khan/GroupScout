import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// In-memory store for test results (since it's a transient dev tool)
// In a real production app we'd use Redis or Postgres
let latestTestResult: any = null;

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

  try {
    const data = await request.json()
    latestTestResult = {
      timestamp: Date.now(),
      ...data
    }
    return NextResponse.json({ success: true }, { headers: getCorsHeaders(request) })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: getCorsHeaders(request) })
  }
}

export async function GET(request: Request) {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  return NextResponse.json(latestTestResult || { error: "No test results available" })
}
