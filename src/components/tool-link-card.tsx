import NextLink from "next/link";
import { Circle, HStack, Link as ChakraLink, Text, VStack } from "@chakra-ui/react";
import type { ComponentType } from "react";

import { GlassCard } from "@/components/ui/glass-card";

type IconComponent = ComponentType<{ size?: number }>;

type ToolLinkCardProps = {
  href: string;
  name: string;
  description: string;
  Icon: IconComponent;
  /** Chakra color token for the icon circle, e.g. "dock.calendar" */
  accent?: string;
};

export function ToolLinkCard({
  href,
  name,
  description,
  Icon,
  accent = "brand.fg",
}: ToolLinkCardProps) {
  return (
    <ChakraLink asChild _hover={{ textDecoration: "none" }} h="full">
      <NextLink href={href}>
        <GlassCard
          p={6}
          h="full"
          transition="transform 0.18s ease, box-shadow 0.18s ease"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          _active={{ transform: "translateY(0)" }}
        >
          <HStack gap={3} align="start">
            <Circle
              size={10}
              bg={accent === "brand.fg" ? "brand.subtle" : `${accent}/15`}
              color={accent}
              flexShrink={0}
            >
              <Icon size={20} />
            </Circle>
            <VStack align="start" gap={1}>
              <Text fontWeight="semibold">{name}</Text>
              <Text fontSize="sm" color="fg.muted">
                {description}
              </Text>
            </VStack>
          </HStack>
        </GlassCard>
      </NextLink>
    </ChakraLink>
  );
}
