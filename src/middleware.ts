import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get("sessionId")?.value
  
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard")
  const isAuthRoute = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup"

  if (isDashboardRoute && !sessionId) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isAuthRoute && sessionId) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login", "/signup"],
}
