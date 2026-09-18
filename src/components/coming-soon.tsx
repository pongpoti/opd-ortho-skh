import type { LucideIcon } from "lucide-react"
import { Badge, Card, Flex, Heading, Text } from "@chakra-ui/react"

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Flex as="main" mx="auto" w="full" maxW="5xl" flex="1" direction="column" align="center" justify="center" px="4" py="16">
      <Card.Root w="full" maxW="sm" textAlign="center">
        <Card.Header alignItems="center" gap="3">
          <Flex
            mx="auto"
            boxSize="12"
            align="center"
            justify="center"
            borderRadius="xl"
            bg="brand.muted"
            color="brand.fg"
          >
            <Icon size={24} aria-hidden="true" />
          </Flex>
          <Heading size="md">{title}</Heading>
          <Text color="fg.muted">{description}</Text>
        </Card.Header>
        <Card.Body>
          <Badge variant="subtle" colorPalette="gray">
            อยู่ระหว่างการพัฒนา เร็ว ๆ นี้
          </Badge>
        </Card.Body>
      </Card.Root>
    </Flex>
  )
}
