import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/constants/config";

// Cheap redirect for signed-out visitors; the session itself is verified server-side in lib/auth.ts
export function middleware(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next|favicon.ico).*)"],
};
