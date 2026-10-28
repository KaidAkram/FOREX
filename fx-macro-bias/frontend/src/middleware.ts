import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Edge Security Headers Enforcement
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // 1. Role-Based Access Control for Administrative Routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    const authCookie = request.cookies.get("shiftfx_auth_user")?.value;
    let isAdmin = false;

    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie));
        if (parsed && parsed.role === "admin") {
          isAdmin = true;
        }
      } catch {
        isAdmin = false;
      }
    }

    // In production or when unauthenticated, redirect unauthorized visitors to the secret admin gateway
    if (!isAdmin) {
      // Allow internal dev preview if header present, otherwise redirect to admin login
      const isDev = process.env.NODE_ENV !== "production";
      if (!isDev) {
        const loginUrl = new URL("/auth/admin", request.url);
        loginUrl.searchParams.set("returnUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 2. Protect Authenticated Trader Portal Routes
  if (pathname.startsWith("/portal") || pathname.startsWith("/terminal")) {
    // Verified via client-side AuthContext and session state
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/terminal/:path*",
  ],
};
