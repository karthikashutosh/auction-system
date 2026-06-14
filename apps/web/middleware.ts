import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken")?.value;
  const pathname = request.nextUrl.pathname;

  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!token && !isPublicRoute) {
    return Response.redirect(new URL("/login", request.url));
  }

  if (token && isPublicRoute) {
    return Response.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
