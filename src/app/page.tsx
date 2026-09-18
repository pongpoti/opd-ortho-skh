import NextLink from "next/link";
import {
  Card,
  Heading,
  Link as ChakraLink,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import { modules } from "@/lib/modules";

export default function Home() {
  return (
    <Stack gap="6">
      <Stack gap="1">
        <Heading size="xl">OPD Ortho SKH</Heading>
        <Text color="fg.muted">เครื่องมือภายในสำหรับแผนกผู้ป่วยนอกศัลยกรรมกระดูก</Text>
      </Stack>
      <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
        {modules.map((mod) => (
          <ChakraLink asChild key={mod.slug} _hover={{ textDecoration: "none" }}>
            <NextLink href={mod.href}>
              <Card.Root _hover={{ shadow: "md" }} transition="box-shadow 0.2s">
                <Card.Body>
                  <Card.Title>{mod.name}</Card.Title>
                  <Card.Description>{mod.description}</Card.Description>
                </Card.Body>
              </Card.Root>
            </NextLink>
          </ChakraLink>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
