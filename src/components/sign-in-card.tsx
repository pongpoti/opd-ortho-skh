"use client"

import * as React from "react"
import { Bone, LogIn } from "lucide-react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Alert, Button, Card, Flex, Heading, Text } from "@chakra-ui/react"

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
    <Card.Root w="full" maxW="sm">
      <Card.Header alignItems="center" gap="3" textAlign="center">
        <Flex
          mx="auto"
          boxSize="12"
          align="center"
          justify="center"
          borderRadius="xl"
          bg="brand.solid"
          color="brand.contrast"
        >
          <Bone size={24} aria-hidden="true" />
        </Flex>
        <Heading size="md">เข้าสู่ระบบ</Heading>
        <Text color="fg.muted">ลงชื่อเข้าใช้ด้วยบัญชี LINE เพื่อใช้งานระบบ</Text>
      </Card.Header>
      <Card.Body display="flex" flexDir="column" gap="4">
        {error ? (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Description>{ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default}</Alert.Description>
          </Alert.Root>
        ) : null}
        <Button w="full" size="lg" onClick={handleSignIn} loading={isSigningIn} loadingText="กำลังเข้าสู่ระบบ…">
          <LogIn size={18} />
          เข้าสู่ระบบด้วย LINE
        </Button>
      </Card.Body>
    </Card.Root>
  )
}
