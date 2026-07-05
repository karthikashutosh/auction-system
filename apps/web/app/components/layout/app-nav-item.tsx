"use client";

import { Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  icon: React.ElementType;
  label: string;
  href: string;
  expanded: boolean;
};

export function NavItem({ icon: Icon, label, href, expanded }: Props) {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link href={href}>
      <Flex
        align="center"
        gap={3}
        px={4}
        py={3}
        borderRadius="lg"
        cursor="pointer"
        transition="all 0.2s ease"
        bg={isActive ? "sidebar.active" : "transparent"}
        color={isActive ? "primary" : "sidebar.text"}
        _hover={{
          bg: "sidebar.hover",
        }}
      >
        <Icon size={20} />

        {expanded && (
          <Text
            whiteSpace="nowrap"
            overflow="hidden"
            textOverflow="ellipsis"
            fontWeight={isActive ? "semibold" : "medium"}
          >
            {label}
          </Text>
        )}
      </Flex>
    </Link>
  );
}
