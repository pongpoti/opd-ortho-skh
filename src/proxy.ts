import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  // Temporary test-mode bypass: view/click through the register page without
  // real LINE auth. Requires a secret token (env var, never shipped to the
  // client) in the URL once; a short-lived cookie carries the bypass through
  // the rest of the flow so the token itself only appears in one request.
  if (pathname === "/register") {
    const previewToken = process.env.REGISTER_PREVIEW_TOKEN;
    const hasValidTokenParam = !!previewToken && searchParams.get("preview") === previewToken;
    const hasPreviewCookie = req.cookies.get("preview_ok")?.value === "1";

    if (hasValidTokenParam || hasPreviewCookie) {
      const res = NextResponse.next();
      if (hasValidTokenParam) {
        res.cookies.set("preview_ok", "1", {
          maxAge: 60 * 60,
          path: "/register",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
      return res;
    }
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
