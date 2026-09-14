"use client"

import { Bone, LogIn } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SignInCard() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Bone className="size-8 text-primary" aria-hidden="true" />
        <CardTitle className="text-xl">เข้าสู่ระบบ</CardTitle>
        <CardDescription>ลงชื่อเข้าใช้ด้วยบัญชี LINE เพื่อใช้งานระบบ</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={() => signIn("line", { callbackUrl })}>
          <LogIn />
          เข้าสู่ระบบด้วย LINE
        </Button>
      </CardContent>
    </Card>
  )
}
