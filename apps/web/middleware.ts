import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("accessToken");
  const refreshToken = request.cookies.get("refreshToken");

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const hasAuth = !!accessToken || !!refreshToken;

  // Unauthenticated user trying to access protected route
  if (!isPublicRoute && !hasAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated user trying to access guest route
  if (isPublicRoute && hasAuth) {
    return NextResponse.redirect(new URL("/marketplace", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/marketplace/:path*",
    "/profile/:path*",
    "/create/:path*",
    "/auctions/:path*",
  ],
};
