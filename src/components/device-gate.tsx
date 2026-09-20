"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Button, Flex, Heading, Text, VStack, Spinner } from "@chakra-ui/react";
import { Smartphone } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { ensureLiffInitWithTimeout, liff } from "@/lib/liff-client";

type GateStatus = "checking" | "blocked" | "allowed";

export function DeviceGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Temporary test-mode bypass: skip the LIFF-in-client check entirely.
      if (new URLSearchParams(window.location.search).get("preview") === "1") {
        if (!cancelled) setStatus("allowed");
        return;
      }

      try {
        await ensureLiffInitWithTimeout();
        if (!cancelled) setStatus(liff.isInClient() ? "allowed" : "blocked");
      } catch {
        if (!cancelled) setStatus("blocked");
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <Flex minH="100dvh" align="center" justify="center">
        <Spinner colorPalette="brand" size="lg" />
      </Flex>
    );
  }

  if (status === "blocked") {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    return (
      <Flex minH="100dvh" align="center" justify="center" px={4}>
        <GlassCard p={8} maxW="sm" w="full">
          <VStack gap={4} textAlign="center">
            <Smartphone size={40} />
            <Heading size="lg">กรุณาเปิดผ่านแอป LINE</Heading>
            <Text color="fg.muted">
              ระบบนี้รองรับการใช้งานบนมือถือและแท็บเล็ตผ่านแอป LINE เท่านั้น
              กรุณาแตะปุ่มด้านล่างเพื่อเปิดผ่านแอป LINE
            </Text>
            {liffId && (
              <Button asChild bg="#06C755" color="white" _hover={{ opacity: 0.9 }}>
                <a href={`https://liff.line.me/${liffId}`}>เปิดด้วย LINE</a>
              </Button>
            )}
          </VStack>
        </GlassCard>
      </Flex>
    );
  }

  return <>{children}</>;
}
