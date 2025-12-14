import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/api/chats", "/api/teams", "/api/billing"];

// Routes that require Super-Admin
const adminRoutes = ["/admin", "/api/admin"];

// Routes that are always public
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/c/", // Public chat view
  "/embed/", // Iframe embed
  "/api/embed/", // Embed API
  "/invite/", // Team invitation links
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth();

  // Check admin routes - require Super-Admin
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user is Super-Admin
    if (!session.user?.isSuperAdmin) {
      // Redirect non-admins to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Check protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
