"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Alert, Button, Heading, Spinner, Text, VStack } from "@chakra-ui/react";

import { GlassCard } from "@/components/ui/glass-card";
import { ensureLiffInit, liff } from "@/lib/liff-client";

type Status = "initializing" | "needs-login" | "signing-in" | "error";

export function LoginClient() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("initializing");

  useEffect(() => {
    let cancelled = false;

    async function exchangeToken() {
      const idToken = liff.getIDToken();
      if (!idToken) {
        if (!cancelled) setStatus("error");
        return;
      }

      if (!cancelled) setStatus("signing-in");
      const result = await signIn("credentials", { idToken, redirect: false });
      if (cancelled) return;

      if (result?.ok) {
        router.refresh();
      } else {
        setStatus("error");
      }
    }

    async function init() {
      try {
        await ensureLiffInit();
        if (cancelled) return;

        if (liff.isLoggedIn()) {
          await exchangeToken();
        } else {
          setStatus("needs-login");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleLoginClick() {
    liff.login();
  }

  return (
    <GlassCard p={8} maxW="sm" w="full">
      <VStack gap={4} textAlign="center">
        <Heading size="lg">เข้าสู่ระบบ</Heading>

        {status === "initializing" || status === "signing-in" ? (
          <>
            <Spinner colorPalette="brand" />
            <Text color="fg.muted">
              {status === "signing-in" ? "กำลังเข้าสู่ระบบ…" : "กำลังเตรียมระบบ…"}
            </Text>
          </>
        ) : (
          <>
            <Text color="fg.muted">กรุณาเข้าสู่ระบบด้วยบัญชี LINE เพื่อใช้งาน</Text>
            {status === "error" && (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}
            <Button onClick={handleLoginClick} bg="#06C755" color="white" _hover={{ opacity: 0.9 }}>
              เข้าสู่ระบบด้วย LINE
            </Button>
          </>
        )}
      </VStack>
    </GlassCard>
  );
}
