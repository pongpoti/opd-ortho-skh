import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { canAccessCastRoom, canAccessCastRoomDashboard } from "@/lib/module-access";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isRegistered = req.auth?.user?.isRegistered ?? false;
  const role = req.auth?.user?.role;

  if (!isAuthed && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthed && !isRegistered && pathname !== "/register") {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  if (isAuthed && isRegistered && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isAuthed && isRegistered && pathname.startsWith("/cast-room")) {
    if (!canAccessCastRoom(role)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (
      (pathname.startsWith("/cast-room/dashboard") || pathname.startsWith("/cast-room/pdf")) &&
      !canAccessCastRoomDashboard(role)
    ) {
      return NextResponse.redirect(new URL("/cast-room", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
