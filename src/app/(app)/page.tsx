import { SimpleGrid, Text, VStack } from "@chakra-ui/react";

import { auth } from "@/auth";
import { AnimatedLogo } from "@/components/animated-logo";
import { ToolLinkCard } from "@/components/tool-link-card";
import { MODULE_ICONS } from "@/lib/module-icons";
import { modulesForRole } from "@/lib/module-access";

export default async function Home() {
  const session = await auth();
  const visibleModules = modulesForRole(session?.user?.role);

  return (
    <VStack align="stretch" gap={8} py={{ base: 2, sm: 4 }}>
      <VStack gap={3} align="center" textAlign="center">
        <AnimatedLogo style={{ width: "100%", maxWidth: "26rem" }} />
        <Text color="fg.muted" fontSize="md" maxW="md">
          เลือกเครื่องมือสำหรับงาน OPD ออร์โธปิดิกส์
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, sm: Math.min(3, Math.max(1, visibleModules.length)) }} gap={4}>
        {visibleModules.map((mod) => (
          <ToolLinkCard
            key={mod.slug}
            href={mod.href}
            name={mod.name}
            description={mod.description}
            Icon={MODULE_ICONS[mod.icon]}
            accent={`dock.${mod.icon}`}
          />
        ))}
      </SimpleGrid>
    </VStack>
  );
}
