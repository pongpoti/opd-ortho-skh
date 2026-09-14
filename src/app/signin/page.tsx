import type { Metadata } from "next"
import { Suspense } from "react"

import { SignInCard } from "@/components/sign-in-card"

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
}

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-16">
      <Suspense>
        <SignInCard />
      </Suspense>
    </main>
  )
}
