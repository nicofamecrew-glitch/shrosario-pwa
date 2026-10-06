import { NextRequest, NextResponse } from "next/server";

// GUÍA remains available for local development, never for this production release.
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/guia/:path*", "/api/guia/:path*"],
};
