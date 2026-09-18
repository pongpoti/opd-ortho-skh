import NextLink from "next/link"
import { ChevronRight } from "lucide-react"
import { Badge, Box, Card, Flex, Heading, HStack, Link as ChakraLink, SimpleGrid, Text } from "@chakra-ui/react"

import { siteConfig } from "@/config/site"

export default function DashboardPage() {
  return (
    <Flex as="main" mx="auto" w="full" maxW="5xl" flex="1" direction="column" gap="8" px={{ base: "4", sm: "6" }} py="8">
      <Flex direction="column" gap="1">
        <Heading size={{ base: "xl", sm: "2xl" }}>แดชบอร์ด</Heading>
        <Text color="fg.muted">เลือกระบบงานที่ต้องการใช้งาน</Text>
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
        {siteConfig.nav.map((item) => (
          <ChakraLink
            key={item.href}
            asChild
            borderRadius="xl"
            outline="none"
            textDecoration="none"
            _focusVisible={{ ring: "3px", ringColor: "brand.focusRing/50" }}
          >
            <NextLink href={item.href}>
              <Card.Root
                h="full"
                gap="0"
                py="5"
                transitionProperty="common"
                transitionDuration="moderate"
                _hover={{ borderColor: "brand.border/40", bg: "brand.subtle" }}
              >
                <Flex align="flex-start" gap="4" px="5">
                  <Flex
                    boxSize="10"
                    flexShrink="0"
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="brand.muted"
                    color="brand.fg"
                  >
                    <item.icon size={20} aria-hidden="true" />
                  </Flex>
                  <Flex minW="0" flex="1" direction="column" gap="1">
                    <HStack wrap="wrap" gap="2" fontWeight="medium">
                      <Text as="span">{item.title}</Text>
                      {item.comingSoon ? (
                        <Badge variant="subtle" colorPalette="gray" fontWeight="normal">
                          เร็ว ๆ นี้
                        </Badge>
                      ) : null}
                    </HStack>
                    <Text fontSize="sm" color="fg.muted">
                      {item.description}
                    </Text>
                  </Flex>
                  <Box mt="2" flexShrink="0" color="fg.muted">
                    <ChevronRight size={16} aria-hidden="true" />
                  </Box>
                </Flex>
              </Card.Root>
            </NextLink>
          </ChakraLink>
        ))}
      </SimpleGrid>
    </Flex>
  )
}
