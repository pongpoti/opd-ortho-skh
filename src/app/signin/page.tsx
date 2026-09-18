import type { Metadata } from "next"
import { Suspense } from "react"
import { Flex } from "@chakra-ui/react"

import { SignInCard } from "@/components/sign-in-card"

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
}

export default function SignInPage() {
  return (
    <Flex as="main" mx="auto" w="full" maxW="4xl" flex="1" direction="column" align="center" justify="center" px="4" py="16">
      <Suspense>
        <SignInCard />
      </Suspense>
    </Flex>
  )
}
