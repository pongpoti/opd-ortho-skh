import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/signin",
  },
})

export const config = {
  // viewport-check is a temporary public diagnostic page — see that page.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|signin|viewport-check).*)"],
}
