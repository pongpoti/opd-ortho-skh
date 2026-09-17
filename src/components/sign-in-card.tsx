"use client"

import * as React from "react"
import { AlertCircle, Bone, LogIn } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง (กดปุ่มเข้าสู่ระบบเพียงครั้งเดียวแล้วรอสักครู่)",
  OAuthSignin: "ไม่สามารถเชื่อมต่อกับ LINE ได้ กรุณาลองใหม่อีกครั้ง",
  AccessDenied: "คุณยกเลิกการอนุญาตให้เข้าสู่ระบบด้วย LINE",
  Default: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง",
}

export function SignInCard() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"
  const error = searchParams.get("error")
  const [isSigningIn, setIsSigningIn] = React.useState(false)

  function handleSignIn() {
    if (isSigningIn) return
    setIsSigningIn(true)
    signIn("line", { callbackUrl })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center gap-3 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Bone className="size-6" aria-hidden="true" />
        </span>
        <CardTitle className="text-lg">เข้าสู่ระบบ</CardTitle>
        <CardDescription>ลงชื่อเข้าใช้ด้วยบัญชี LINE เพื่อใช้งานระบบ</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}</AlertDescription>
          </Alert>
        ) : null}
        <Button className="w-full" size="lg" onClick={handleSignIn} disabled={isSigningIn}>
          <LogIn />
          {isSigningIn ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบด้วย LINE"}
        </Button>
      </CardContent>
    </Card>
  )
}
