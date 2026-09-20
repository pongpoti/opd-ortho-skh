"use client";

import { useEffect, useRef } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Circle, Flex, Text, VStack } from "@chakra-ui/react";
import { Home } from "lucide-react";

import { MODULE_ICONS } from "@/lib/module-icons";
import { modules } from "@/lib/modules";

export function MobileDock() {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Pinned to the real screen bottom via position:fixed (not the flex-child/
  // --app-vh approach the rest of the shell uses), so an open keyboard simply
  // covers it instead of pushing it up the page. ScrollableMain needs to know
  // how tall it actually is to reserve matching space during normal scroll,
  // measured rather than hard-coded since the label wraps on narrow screens.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setDockHeight = () => {
      document.documentElement.style.setProperty("--dock-h", `${el.offsetHeight}px`);
    };
    setDockHeight();
    const observer = new ResizeObserver(setDockHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const items = [
    { href: "/", label: "หน้าแรก", Icon: Home, color: "dock.home" },
    ...modules.map((mod) => ({
      href: mod.href,
      label: mod.name,
      Icon: MODULE_ICONS[mod.icon],
      color: `dock.${mod.icon}`,
    })),
  ];

  return (
    <Flex
      ref={ref}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={20}
      display={{ base: "flex", sm: "none" }}
      backgroundImage={{
        base: "linear-gradient(to bottom, rgba(31, 143, 134, 0.16), #ffffff)",
        _dark: "linear-gradient(to bottom, rgba(75, 196, 182, 0.18), #000000)",
      }}
      borderTopWidth="1px"
      borderColor="dock.border"
      backdropFilter="blur(16px)"
      justify="space-around"
      align="center"
      pt={2}
      pb="calc(0.5rem + env(safe-area-inset-bottom))"
    >
      {items.map(({ href, label, Icon, color }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <VStack
            key={href}
            asChild
            gap={1}
            flex="1"
            py={1}
            color={active ? color : "fg.muted"}
          >
            <NextLink href={href}>
              <Circle size={10} bg={active ? `${color}/15` : "transparent"} color={color}>
                <Icon size={20} />
              </Circle>
              <Text fontSize="xs" fontWeight={active ? "semibold" : "medium"}>
                {label}
              </Text>
            </NextLink>
          </VStack>
        );
      })}
    </Flex>
  );
}
