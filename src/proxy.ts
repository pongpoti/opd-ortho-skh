import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Temporary test-mode bypass: view/click through the register page without
  // real LINE auth. Narrowly scoped to this one path+param combo.
  if (pathname === "/register" && searchParams.get("preview") === "1") {
    return NextResponse.next();
  }

  const isAuthed = !!req.auth;
  const isRegistered = req.auth?.user?.isRegistered ?? false;

  if (!isAuthed && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthed && !isRegistered && pathname !== "/register") {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  if (isAuthed && isRegistered && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
