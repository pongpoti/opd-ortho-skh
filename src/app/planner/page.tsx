import { Box, Button, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { Bone, LogOut } from "lucide-react";

import { auth, signIn, signOut } from "@/auth";
import { ColorModeToggle } from "@/components/color-mode-toggle";
import { GlassCard } from "@/components/ui/glass-card";
import { bangkokToday } from "@/lib/bangkok-date";
import { DutyPlanner } from "@/modules/duty-schedule/components/duty-planner";
import { nextMonth } from "@/modules/duty-schedule/lib/second-call-repository";

export const metadata = {
  title: "วางแผนเวร - OPD Ortho SKH",
};

/**
 * Desktop planner in an ordinary browser: web LINE Login instead of LIFF,
 * admins only. Opens on the upcoming month.
 */
export default async function DesktopPlannerPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  async function login() {
    "use server";
    await signIn("line", { redirectTo: "/planner" });
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/planner" });
  }

  if (!isAdmin) {
    return (
      <Flex minH="var(--app-vh)" align="center" justify="center" p={6}>
        <GlassCard p={10} maxW="lg" w="full">
          <VStack gap={5} textAlign="center">
            <Bone size={44} />
            <Heading as="h1" fontSize="2xl">วางแผนตารางเวร</Heading>
            {session ? (
              <>
                <Text fontSize="xl" lineHeight="1.7">
                  บัญชี LINE นี้ไม่มีสิทธิ์ใช้หน้าวางแผนเวร (เฉพาะผู้ดูแลระบบ)
                </Text>
                <form action={logout}>
                  <Button type="submit" size="xl" fontSize="lg" variant="outline">
                    <LogOut size={22} /> ออกจากระบบ
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Text fontSize="xl" lineHeight="1.7">
                  กรุณาเข้าสู่ระบบด้วยบัญชี LINE ของผู้ดูแลระบบ
                </Text>
                <form action={login}>
                  <Button type="submit" size="xl" fontSize="lg" bg="#06C755" color="white" _hover={{ opacity: 0.9 }}>
                    เข้าสู่ระบบด้วย LINE
                  </Button>
                </form>
              </>
            )}
          </VStack>
        </GlassCard>
      </Flex>
    );
  }

  const today = bangkokToday();
  const upcoming = nextMonth(today.year, today.month);
  return (
    <Box minH="var(--app-vh)">
      <Box
        position="sticky"
        top={0}
        zIndex={15}
        data-app-header=""
        bg="glass.bg"
        borderBottomWidth="1px"
        borderColor="glass.border"
        backdropFilter="blur(16px)"
        boxShadow="sm"
      >
        <Flex mx="auto" w="full" maxW="1120px" align="center" gap={3} px={6} py={3}>
          <HStack gap={2} fontWeight="semibold" fontSize="xl">
            <Bone size={24} />
            <span>OPD Ortho SKH</span>
          </HStack>
          <HStack ml="auto" gap={3}>
            {session.user.lineDisplayName && (
              <Text fontSize="lg" fontWeight="medium">{session.user.lineDisplayName}</Text>
            )}
            <ColorModeToggle />
            <form action={logout}>
              <Button type="submit" size="lg" variant="outline">
                <LogOut size={20} /> ออกจากระบบ
              </Button>
            </form>
          </HStack>
        </Flex>
      </Box>
      <Box as="main" mx="auto" w="full" maxW="5xl" px={6} pt={8}>
        <DutyPlanner initialYear={upcoming.year} initialMonth={upcoming.month} />
      </Box>
    </Box>
  );
}
