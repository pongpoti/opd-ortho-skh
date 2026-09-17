"use client"

import * as React from "react"
import { Bone, LogIn } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button, Callout, Card, Text, Title } from "@tremor/react"

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
      <div className="flex flex-col items-center gap-2 text-center">
        <Bone className="size-8 text-tremor-brand dark:text-dark-tremor-brand" aria-hidden="true" />
        <Title>เข้าสู่ระบบ</Title>
        <Text>ลงชื่อเข้าใช้ด้วยบัญชี LINE เพื่อใช้งานระบบ</Text>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {error ? (
          <Callout title="เข้าสู่ระบบไม่สำเร็จ" color="red" className="bg-red-500/10 dark:bg-red-500/20">
            {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}
          </Callout>
        ) : null}
        <Button className="w-full justify-center" icon={LogIn} onClick={handleSignIn} disabled={isSigningIn}>
          {isSigningIn ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบด้วย LINE"}
        </Button>
      </div>
    </Card>
  )
}
